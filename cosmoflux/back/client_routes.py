from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from models import Cliente, Venda, Parcela, Produto, Movimentacao, Pedido, ItemPedido, get_db
from auth_routes import get_ctx

client_router = APIRouter(prefix="/api", tags=["clientes"])

def calc_status_pag_cli(venda, hoje):
    """Calcula status de pagamento em tempo real."""
    if not venda: return "pago"
    # cancelado tem prioridade máxima — nunca é sobrescrito pelo cálculo de parcelas
    if venda.status_pagamento == "cancelado":
        return "cancelado"
    parcelas = venda.parcelas
    if not parcelas:
        if venda.data_vencimento and venda.data_vencimento < hoje:
            return "vencido"
        return venda.status_pagamento or "em_aberto"
    if all(p.pago for p in parcelas): return "pago"
    if any(not p.pago and p.vencimento < hoje for p in parcelas): return "vencido"
    return "em_aberto"

def tf(q, model, ctx):
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        return q.filter(model.tenant_id == ctx["tenant_id"])
    return q

def tid(ctx):
    return None if ctx["admin"] else ctx.get("tenant_id")

# ── SCHEMAS ───────────────────────────────────────────────────────
class ClienteSchema(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    cep: Optional[str] = None
    observacao: Optional[str] = None

class VendaSchema(BaseModel):
    cliente_id: int
    descricao: Optional[str] = None
    valor_total: float
    modo_pagamento: str
    parcelado: bool = False
    num_parcelas: int = 1
    data_vencimento: Optional[str] = None
    observacao: Optional[str] = None
    valor_entrada: float = 0.0
    modo_pagamento_entrada: Optional[str] = None

class ItemVendaSchema(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float
    desconto_item: float = 0.0

class VendaUnificadaSchema(BaseModel):
    cliente_id: Optional[int] = None
    itens: list[ItemVendaSchema]
    modo_pagamento: str
    parcelado: bool = False
    num_parcelas: int = 1
    data_vencimento: Optional[str] = None
    desconto_geral: float = 0.0
    observacao: Optional[str] = None
    valor_entrada: float = 0.0
    modo_pagamento_entrada: Optional[str] = None
    valor_livre: Optional[float] = None       # venda sem produto
    descricao_livre: Optional[str] = None

class PagarParcelaSchema(BaseModel):
    data_pago:      Optional[str] = None
    valor_abatido:  Optional[float] = None   # None = paga total; float = abatimento parcial


# ── VENDA UNIFICADA ───────────────────────────────────────────────
@client_router.post("/vendas/unificada")
def criar_venda_unificada(dados: VendaUnificadaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    from models import Produto, Movimentacao, ItemPedido, Pedido
    if not dados.itens and not dados.valor_livre:
        raise HTTPException(400, "Informe ao menos 1 produto ou um valor livre")

    # verifica cliente se informado
    cliente = None
    if dados.cliente_id:
        cliente = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == dados.cliente_id).first()
        if not cliente: raise HTTPException(404, "Cliente nao encontrado")

    # fiado exige cliente
    if dados.modo_pagamento == "fiado" and not dados.cliente_id:
        raise HTTPException(400, "Venda fiado exige cliente cadastrado")

    # calcula total
    if dados.valor_livre and dados.valor_livre > 0:
        total = round(dados.valor_livre, 2)
    else:
        subtotal = sum(it.quantidade * it.preco_unitario - it.desconto_item for it in dados.itens)
        total = round(subtotal - dados.desconto_geral, 2)

    obs_final = dados.observacao or (dados.descricao_livre if dados.valor_livre else None)

    # cria pedido vinculado
    pedido = Pedido(
        cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
        status="concluido", total=total,
        desconto=dados.desconto_geral if not dados.valor_livre else 0,
        observacao=obs_final, tenant_id=tid(ctx),
    )
    db.add(pedido); db.flush()

    # itens + baixa estoque + movimentacao saida (só se houver itens)
    for it in dados.itens:
        p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == it.produto_id).first()
        if not p: raise HTTPException(404, f"Produto {it.produto_id} nao encontrado")
        if p.estoque_atual < it.quantidade:
            raise HTTPException(400, f"Estoque insuficiente para '{p.nome}'. Disponivel: {p.estoque_atual}")
        db.add(ItemPedido(pedido_id=pedido.id, produto_id=it.produto_id,
                          quantidade=it.quantidade, preco_unitario=it.preco_unitario,
                          desconto_item=it.desconto_item))
        p.estoque_atual -= it.quantidade
        db.add(Movimentacao(produto_id=p.id, tipo="saida", quantidade=it.quantidade,
                            motivo="venda", observacao=f"Venda #{pedido.id}",
                            usuario_id=ctx["usuario_id"], tenant_id=tid(ctx)))

    # cria venda financeira se tiver cliente
    venda_id = None
    if dados.cliente_id:
        venc = datetime.strptime(dados.data_vencimento, "%Y-%m-%d").date() if dados.data_vencimento else None
        entrada = round(min(dados.valor_entrada or 0.0, total), 2)
        restante = round(total - entrada, 2)
        tem_restante = restante > 0.01
        status_pag = "pendente" if (tem_restante or dados.modo_pagamento in ["fiado", "boleto"] or dados.parcelado) else "pago"
        obs_entrada = f"Entrada: R$ {entrada:.2f} ({dados.modo_pagamento_entrada or dados.modo_pagamento}). " if entrada > 0 else ""
        venda = Venda(
            cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
            descricao=f"Pedido #{pedido.id}", valor_total=total,
            modo_pagamento=dados.modo_pagamento, parcelado=dados.parcelado,
            num_parcelas=dados.num_parcelas, data_vencimento=venc,
            status_pagamento=status_pag,
            observacao=(obs_entrada + (dados.observacao or "")).strip() or None,
            tenant_id=tid(ctx),
        )
        db.add(venda); db.flush()
        venda_id = venda.id

        # parcela de entrada (já paga)
        if entrada > 0:
            from datetime import date as date_type
            db.add(Parcela(venda_id=venda.id, numero=0, valor=entrada,
                           vencimento=date_type.today(), pago=True,
                           data_pago=date_type.today()))

        # parcelas do restante — SEMPRE cria quando há saldo (gera vencimento
        # automático de 30 dias se nenhuma data foi informada), garantindo que
        # toda venda com saldo tenha parcelas gerenciáveis (pagar/abater)
        if tem_restante:
            from datetime import timedelta
            base_venc = venc or (date.today() + timedelta(days=30))
            if dados.parcelado and dados.num_parcelas > 1:
                valor_parc = round(restante / dados.num_parcelas, 2)
                acumulado = 0.0
                for i in range(dados.num_parcelas):
                    mes = base_venc.month + i
                    ano = base_venc.year + (mes - 1) // 12
                    mes = ((mes - 1) % 12) + 1
                    try:    venc_parc = base_venc.replace(year=ano, month=mes)
                    except ValueError:
                        import calendar
                        ultimo_dia = calendar.monthrange(ano, mes)[1]
                        venc_parc = base_venc.replace(year=ano, month=mes, day=ultimo_dia)
                    # última parcela ajusta centavos para fechar o total exato
                    if i == dados.num_parcelas - 1:
                        valor_parc = round(restante - acumulado, 2)
                    acumulado = round(acumulado + valor_parc, 2)
                    db.add(Parcela(venda_id=venda.id, numero=i+1, valor=valor_parc, vencimento=venc_parc))
            else:
                db.add(Parcela(venda_id=venda.id, numero=1, valor=restante, vencimento=base_venc))

    db.commit()
    return {"mensagem": "Venda registrada", "pedido_id": pedido.id, "venda_id": venda_id, "total": total}

# ── CLIENTES ──────────────────────────────────────────────────────
@client_router.get("/clientes")
def listar_clientes(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    clientes = tf(db.query(Cliente), Cliente, ctx).filter(
        Cliente.ativo == True).order_by(Cliente.nome).all()
    hoje = date.today()
    resultado = []
    for c in clientes:
        parcelas_vencidas = parcelas_proximas = 0
        total_em_aberto = 0.0
        vendas_ativas = [v for v in c.vendas if v.status_pagamento != "cancelado"]
        for v in vendas_ativas:
            for p in v.parcelas:
                if not p.pago:
                    total_em_aberto += p.valor
                    if p.vencimento < hoje:            parcelas_vencidas += 1
                    elif (p.vencimento - hoje).days <= 5: parcelas_proximas += 1
        resultado.append({
            "id": c.id, "nome": c.nome, "email": c.email,
            "telefone": c.telefone, "cpf": c.cpf,
            "endereco": c.endereco, "cidade": c.cidade, "cep": c.cep,
            "observacao": c.observacao, "usuario_id": c.usuario_id,
            "vendedor": c.usuario_rel.nome if c.usuario_rel else None,
            "criado_em": c.criado_em.strftime("%d/%m/%Y") if c.criado_em else None,
            "total_vendas": len(vendas_ativas),
            "total_em_aberto": round(total_em_aberto, 2),
            "parcelas_vencidas": parcelas_vencidas,
            "parcelas_proximas": parcelas_proximas,
            "alerta": "vencido" if parcelas_vencidas > 0 else "proximo" if parcelas_proximas > 0 else None,
        })
    return resultado

@client_router.get("/clientes/{cliente_id}")
def detalhe_cliente(cliente_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    c = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == cliente_id).first()
    if not c: raise HTTPException(404, "Cliente não encontrado")
    hoje = date.today()
    vendas = []
    for v in sorted(c.vendas, key=lambda x: x.id, reverse=True):
        try:
            parcelas = []
            for p in sorted(v.parcelas, key=lambda x: x.numero):
                try:
                    vp_parc = getattr(p, "valor_pago", None) or 0
                    saldo   = round(p.valor - vp_parc, 2)
                    venc    = getattr(p, "vencimento", None)
                    if venc:
                        st = ("pago" if p.pago else
                              "parcial" if vp_parc > 0 else
                              "vencido" if venc < hoje else
                              "proximo" if (venc - hoje).days <= 5 else "em_aberto")
                        venc_fmt = venc.strftime("%d/%m/%Y")
                        venc_raw = venc.isoformat()
                    else:
                        st = "pago" if p.pago else "em_aberto"
                        venc_fmt = venc_raw = None
                    parcelas.append({
                        "id": p.id, "numero": p.numero, "valor": p.valor,
                        "valor_pago": round(vp_parc, 2), "saldo_restante": saldo,
                        "vencimento": venc_fmt, "vencimento_raw": venc_raw,
                        "pago": p.pago,
                        "data_pago": p.data_pago.strftime("%d/%m/%Y") if getattr(p,"data_pago",None) else None,
                        "status": st,
                    })
                except Exception:
                    pass

            total_pago_venda = round(sum(
                p["valor"] if p["pago"] else p["valor_pago"] for p in parcelas
            ), 2) if parcelas else (v.valor_total if getattr(v,"status_pagamento","") == "pago" else 0)
            saldo_venda = round(max(v.valor_total - total_pago_venda, 0), 2)

            # localiza o Pedido VINCULADO a esta venda (via descricao "Pedido #X")
            # para trazer itens (produtos) e status de entrega corretos — espelha /pedidos
            pedido = None
            desc = getattr(v, "descricao", "") or ""
            if desc.startswith("Pedido #"):
                try:
                    pid = int(desc.replace("Pedido #", "").strip())
                    pedido = db.query(Pedido).filter(Pedido.id == pid).first()
                except (ValueError, TypeError):
                    pedido = None
            status_entrega = pedido.status if pedido else None

            # itens (produtos) da venda — mesma estrutura que /pedidos retorna
            itens_venda = []
            if pedido:
                for it in pedido.itens:
                    itens_venda.append({
                        "produto_id":     it.produto_id,
                        "produto":        it.produto_rel.nome if it.produto_rel else None,
                        "quantidade":     it.quantidade,
                        "preco_unitario": it.preco_unitario,
                        "desconto_item":  it.desconto_item,
                        "subtotal":       round(it.quantidade * it.preco_unitario - it.desconto_item, 2),
                    })

            dv = getattr(v, "data_vencimento", None)
            dd = getattr(v, "data_venda", None)
            vendas.append({
                "id":               v.id,
                "pedido_id":        pedido.id if pedido else None,
                "descricao":        getattr(v, "descricao", None),
                "valor_total":      v.valor_total,
                "desconto":         getattr(v, "desconto", None) or 0,
                "modo_pagamento":   getattr(v, "modo_pagamento", None),
                "parcelado":        getattr(v, "parcelado", False),
                "num_parcelas":     getattr(v, "num_parcelas", 1),
                "valor_parcela":    getattr(v, "valor_parcela", None),
                "data_venda":       dd.strftime("%d/%m/%Y") if dd else None,
                "data_vencimento":  dv.strftime("%d/%m/%Y") if dv else None,
                "status_pagamento": calc_status_pag_cli(v, hoje),
                "status_entrega":   status_entrega,
                "observacao":       getattr(v, "observacao", None),
                "total_pago":       total_pago_venda,
                "saldo_devedor":    saldo_venda,
                "num_itens":        len(itens_venda),
                "itens":            itens_venda,
                "parcelas":         parcelas,
            })
        except Exception as e:
            # nunca quebra o endpoint por causa de uma venda específica
            pass

    # total em aberto calculado só das vendas não canceladas
    total_aberto = round(sum(
        v["saldo_devedor"] for v in vendas
        if v["status_pagamento"] not in ("cancelado", "pago")
    ), 2)

    return {
        "id": c.id, "nome": c.nome, "email": c.email, "telefone": c.telefone,
        "cpf": c.cpf, "endereco": c.endereco, "cidade": c.cidade, "cep": c.cep,
        "observacao": c.observacao,
        "criado_em": c.criado_em.strftime("%d/%m/%Y") if c.criado_em else None,
        "vendedor": c.usuario_rel.nome if c.usuario_rel else None,
        "total_em_aberto": total_aberto,
        "vendas": vendas,
    }

@client_router.post("/clientes")
def criar_cliente(dados: ClienteSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    cliente = Cliente(**dados.model_dump(), usuario_id=ctx["usuario_id"], tenant_id=tid(ctx))
    db.add(cliente); db.commit(); db.refresh(cliente)
    return {"mensagem": "Cliente criado", "id": cliente.id}

@client_router.put("/clientes/{cliente_id}")
def atualizar_cliente(cliente_id: int, dados: ClienteSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    c = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == cliente_id).first()
    if not c: raise HTTPException(404, "Cliente não encontrado")
    for k, v in dados.model_dump().items(): setattr(c, k, v)
    db.commit()
    return {"mensagem": "Cliente atualizado"}

@client_router.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    c = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == cliente_id).first()
    if not c: raise HTTPException(404, "Cliente não encontrado")
    c.ativo = False; db.commit()
    return {"mensagem": "Cliente removido"}

# ── VENDAS ────────────────────────────────────────────────────────
@client_router.post("/vendas")
def criar_venda(dados: VendaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    # verifica se cliente pertence ao tenant
    c = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == dados.cliente_id).first()
    if not c: raise HTTPException(404, "Cliente não encontrado")

    venc = datetime.strptime(dados.data_vencimento, "%Y-%m-%d").date() if dados.data_vencimento else None
    venda = Venda(
        cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
        descricao=dados.descricao, valor_total=dados.valor_total,
        modo_pagamento=dados.modo_pagamento, parcelado=dados.parcelado,
        num_parcelas=dados.num_parcelas, data_vencimento=venc,
        observacao=obs_final, tenant_id=tid(ctx),
    )
    db.add(venda); db.flush()

    if dados.parcelado and dados.num_parcelas > 1 and venc:
        valor_parc = round(dados.valor_total / dados.num_parcelas, 2)
        for i in range(dados.num_parcelas):
            mes = venc.month + i
            ano = venc.year + (mes - 1) // 12
            mes = ((mes - 1) % 12) + 1
            try:                venc_parc = venc.replace(year=ano, month=mes)
            except ValueError:
                import calendar
                ultimo_dia = calendar.monthrange(ano, mes)[1]
                venc_parc = venc.replace(year=ano, month=mes, day=ultimo_dia)
            db.add(Parcela(venda_id=venda.id, numero=i+1, valor=valor_parc, vencimento=venc_parc))
    elif venc:
        db.add(Parcela(venda_id=venda.id, numero=1, valor=dados.valor_total, vencimento=venc))

    db.commit()
    return {"mensagem": "Venda registrada", "id": venda.id}

@client_router.patch("/parcelas/{parcela_id}/pagar")
def pagar_parcela(parcela_id: int, dados: PagarParcelaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = db.query(Parcela).filter(Parcela.id == parcela_id).first()
    if not p: raise HTTPException(404, "Parcela não encontrada")
    if not ctx["admin"] and p.venda_rel.tenant_id != ctx["tenant_id"]:
        raise HTTPException(403, "Acesso negado")

    data = datetime.strptime(dados.data_pago, "%Y-%m-%d").date() if dados.data_pago else date.today()

    if dados.valor_abatido is None:
        # pagamento total da parcela
        setattr(p, "valor_pago", p.valor)
        p.pago = True
        p.data_pago = data
        if all(parc.pago for parc in p.venda_rel.parcelas):
            p.venda_rel.status_pagamento = "pago"
        db.commit()
        return {"mensagem": "Parcela marcada como paga", "quitada": True,
                "valor_pago": p.valor, "saldo_restante": 0.0}

    # abatimento distribuído entre parcelas em aberto da mesma venda
    abatimento = round(float(dados.valor_abatido), 2)
    if abatimento <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero")

    # todas as parcelas em aberto da venda, ordenadas por numero
    parcelas_abertas = sorted(
        [x for x in p.venda_rel.parcelas if not x.pago],
        key=lambda x: x.numero
    )
    saldo_total = round(sum(x.valor - (getattr(x, "valor_pago", None) or 0) for x in parcelas_abertas), 2)

    if abatimento > saldo_total + 0.01:
        raise HTTPException(400, f"Valor R$ {abatimento:.2f} excede o saldo devedor total de R$ {saldo_total:.2f}")

    restante = abatimento
    parcelas_afetadas = []
    for parc in parcelas_abertas:
        if restante <= 0: break
        saldo_parc = round(parc.valor - (getattr(parc, "valor_pago", None) or 0), 2)
        aplicar = round(min(restante, saldo_parc), 2)
        parc.valor_pago = round((getattr(parc, "valor_pago", None) or 0) + aplicar, 2)
        restante = round(restante - aplicar, 2)
        if (getattr(parc, "valor_pago", None) or 0) >= parc.valor - 0.01:
            setattr(parc, "valor_pago", parc.valor)
            parc.pago = True
            parc.data_pago = data
            parcelas_afetadas.append({"id": parc.id, "numero": parc.numero, "quitada": True})
        else:
            parcelas_afetadas.append({"id": parc.id, "numero": parc.numero, "quitada": False,
                                      "saldo_restante": round(parc.valor - (getattr(parc, "valor_pago", None) or 0), 2)})

    if all(parc.pago for parc in p.venda_rel.parcelas):
        p.venda_rel.status_pagamento = "pago"

    db.commit()

    quitadas = sum(1 for x in parcelas_afetadas if x["quitada"])
    msg = f"R$ {abatimento:.2f} distribuídos. {quitadas} parcela(s) quitada(s)."
    if restante < 0.01 and any(not x["quitada"] for x in parcelas_afetadas):
        ultimo = next(x for x in reversed(parcelas_afetadas) if not x["quitada"])
        msg += f" Saldo restante na {ultimo['numero']}ª parcela: R$ {ultimo['saldo_restante']:.2f}"

    return {
        "mensagem": msg,
        "parcelas_afetadas": parcelas_afetadas,
        "saldo_total_restante": round(saldo_total - abatimento, 2),
    }

class EditarVendaSchema(BaseModel):
    modo_pagamento:  Optional[str]   = None
    data_vencimento: Optional[str]   = None
    observacao:      Optional[str]   = None
    descricao:       Optional[str]   = None

@client_router.patch("/vendas/{venda_id}/cancelar")
def cancelar_venda_alias(venda_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    """Alias registrado antes da rota genérica para evitar conflito de rotas.
    Cancela a Venda E o Pedido vinculado, devolvendo o estoque — espelha DELETE /pedidos/{id}
    para manter as telas de Vendas e Clientes 100% sincronizadas."""
    v = db.query(Venda).filter(Venda.id == venda_id).first()
    if not v: raise HTTPException(404, "Venda não encontrada")
    if not ctx["admin"] and v.tenant_id != ctx["tenant_id"]:
        raise HTTPException(403, "Acesso negado")
    if v.status_pagamento == "cancelado":
        raise HTTPException(400, "Venda já cancelada")

    v.status_pagamento = "cancelado"

    # cancela o Pedido vinculado e devolve estoque (mesma lógica do DELETE /pedidos/{id})
    from models import Pedido, Produto, Movimentacao
    pedido = None
    if v.descricao and v.descricao.startswith("Pedido #"):
        try:
            pid = int(v.descricao.replace("Pedido #", "").strip())
            pedido = db.query(Pedido).filter(Pedido.id == pid).first()
        except (ValueError, TypeError):
            pedido = None
    if pedido and pedido.status != "cancelado":
        for it in pedido.itens:
            prod = db.query(Produto).filter(Produto.id == it.produto_id).first()
            if prod:
                prod.estoque_atual += it.quantidade
                db.add(Movimentacao(produto_id=prod.id, tipo="entrada", quantidade=it.quantidade,
                                    motivo="cancelamento", observacao=f"Cancelamento pedido #{pedido.id}",
                                    usuario_id=ctx["usuario_id"], tenant_id=tid(ctx)))
        pedido.status = "cancelado"

    db.commit()
    return {"mensagem": "Venda e pedido cancelados, estoque devolvido"}

@client_router.patch("/vendas/{venda_id}")
def editar_venda(venda_id: int, dados: EditarVendaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    v = db.query(Venda).filter(Venda.id == venda_id).first()
    if not v: raise HTTPException(404, "Venda não encontrada")
    if not ctx["admin"] and v.tenant_id != ctx["tenant_id"]:
        raise HTTPException(403, "Acesso negado")
    if v.status_pagamento == "cancelado":
        raise HTTPException(400, "Venda cancelada não pode ser editada")

    if dados.modo_pagamento  is not None: v.modo_pagamento  = dados.modo_pagamento
    if dados.observacao      is not None: v.observacao      = dados.observacao
    if dados.descricao       is not None: v.descricao       = dados.descricao
    if dados.data_vencimento is not None:
        nova_venc = datetime.strptime(dados.data_vencimento, "%Y-%m-%d").date()
        v.data_vencimento = nova_venc
        # atualiza parcelas não pagas redistribuindo os vencimentos
        parcelas_em_aberto = sorted(
            [p for p in v.parcelas if not p.pago],
            key=lambda x: x.numero
        )
        for i, p in enumerate(parcelas_em_aberto):
            mes = nova_venc.month + i
            ano = nova_venc.year + (mes - 1) // 12
            mes = ((mes - 1) % 12) + 1
            try:    p.vencimento = nova_venc.replace(year=ano, month=mes)
            except ValueError:
                import calendar
                ultimo = calendar.monthrange(ano, mes)[1]
                p.vencimento = nova_venc.replace(year=ano, month=mes, day=ultimo)

    db.commit()
    return {"mensagem": "Venda atualizada"}

# cancelar_venda movido para antes de editar_venda para evitar conflito de rota

@client_router.patch("/parcelas/{parcela_id}/vencimento")
def alterar_vencimento_parcela(parcela_id: int, dados: dict, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    from pydantic import BaseModel as BM
    p = db.query(Parcela).filter(Parcela.id == parcela_id).first()
    if not p: raise HTTPException(404, "Parcela não encontrada")
    if not ctx["admin"] and p.venda_rel.tenant_id != ctx["tenant_id"]:
        raise HTTPException(403, "Acesso negado")
    if p.pago: raise HTTPException(400, "Parcela já paga")
    nova = dados.get("data_vencimento")
    if not nova: raise HTTPException(400, "data_vencimento obrigatório")
    p.vencimento = datetime.strptime(nova, "%Y-%m-%d").date()
    db.commit()
    return {"mensagem": "Vencimento atualizado"}

@client_router.get("/alertas/pagamentos")
def alertas_pagamentos(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    hoje = date.today()
    limite = hoje + timedelta(days=5)
    q = db.query(Parcela).join(Parcela.venda_rel).filter(
        Parcela.pago == False, Parcela.vencimento <= limite,
    )
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        q = q.filter(Venda.tenant_id == ctx["tenant_id"])
    parcelas = q.order_by(Parcela.vencimento).all()
    return [{
        "parcela_id": p.id, "numero": p.numero, "valor": p.valor,
        "vencimento": p.vencimento.strftime("%d/%m/%Y"),
        "status": "vencido" if p.vencimento < hoje else "proximo",
        "dias": (hoje - p.vencimento).days if p.vencimento < hoje else (p.vencimento - hoje).days,
        "cliente":     p.venda_rel.cliente_rel.nome if p.venda_rel and p.venda_rel.cliente_rel else None,
        "cliente_tel": p.venda_rel.cliente_rel.telefone if p.venda_rel and p.venda_rel.cliente_rel else None,
        "descricao":   p.venda_rel.descricao if p.venda_rel else None,
        "venda_id":    p.venda_id,
    } for p in parcelas]