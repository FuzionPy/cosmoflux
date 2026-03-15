from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from models import Cliente, Venda, Parcela, Produto, Movimentacao, Pedido, ItemPedido, get_db
from auth_routes import get_ctx

client_router = APIRouter(prefix="/api", tags=["clientes"])

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

class ItemVendaSchema(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float
    desconto_item: float = 0.0

class VendaUnificadaSchema(BaseModel):
    cliente_id: Optional[int] = None   # None = balcao
    itens: list[ItemVendaSchema]
    modo_pagamento: str
    parcelado: bool = False
    num_parcelas: int = 1
    data_vencimento: Optional[str] = None
    desconto_geral: float = 0.0
    observacao: Optional[str] = None

class PagarParcelaSchema(BaseModel):
    data_pago: Optional[str] = None


# ── VENDA UNIFICADA ───────────────────────────────────────────────
@client_router.post("/vendas/unificada")
def criar_venda_unificada(dados: VendaUnificadaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    from models import Produto, Movimentacao, ItemPedido, Pedido
    if not dados.itens:
        raise HTTPException(400, "Venda deve ter ao menos 1 item")

    # verifica cliente se informado
    cliente = None
    if dados.cliente_id:
        cliente = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.id == dados.cliente_id).first()
        if not cliente: raise HTTPException(404, "Cliente nao encontrado")

    # fiado exige cliente
    if dados.modo_pagamento == "fiado" and not dados.cliente_id:
        raise HTTPException(400, "Venda fiado exige cliente cadastrado")

    # calcula total
    subtotal = sum(it.quantidade * it.preco_unitario - it.desconto_item for it in dados.itens)
    total = round(subtotal - dados.desconto_geral, 2)

    # cria pedido vinculado
    pedido = Pedido(
        cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
        status="concluido", total=total,
        desconto=dados.desconto_geral, observacao=dados.observacao, tenant_id=tid(ctx),
    )
    db.add(pedido); db.flush()

    # itens + baixa estoque + movimentacao saida
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
        status_pag = "pendente" if dados.modo_pagamento in ["fiado", "boleto"] else "pago"
        venda = Venda(
            cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
            descricao=f"Pedido #{pedido.id}", valor_total=total,
            modo_pagamento=dados.modo_pagamento, parcelado=dados.parcelado,
            num_parcelas=dados.num_parcelas, data_vencimento=venc,
            status_pagamento=status_pag, observacao=dados.observacao, tenant_id=tid(ctx),
        )
        db.add(venda); db.flush()
        venda_id = venda.id

        # parcelas
        if dados.parcelado and dados.num_parcelas > 1 and venc:
            valor_parc = round(total / dados.num_parcelas, 2)
            for i in range(dados.num_parcelas):
                mes = venc.month + i
                ano = venc.year + (mes - 1) // 12
                mes = ((mes - 1) % 12) + 1
                try:    venc_parc = venc.replace(year=ano, month=mes)
                except ValueError:
                    import calendar
                    ultimo_dia = calendar.monthrange(ano, mes)[1]
                    venc_parc = venc.replace(year=ano, month=mes, day=ultimo_dia)
                db.add(Parcela(venda_id=venda.id, numero=i+1, valor=valor_parc, vencimento=venc_parc))
        elif venc:
            db.add(Parcela(venda_id=venda.id, numero=1, valor=total, vencimento=venc))

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
        for v in c.vendas:
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
            "total_vendas": len(c.vendas),
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
    for v in c.vendas:
        parcelas = [{
            "id": p.id, "numero": p.numero, "valor": p.valor,
            "vencimento":     p.vencimento.strftime("%d/%m/%Y"),
            "vencimento_raw": p.vencimento.isoformat(),
            "pago":     p.pago,
            "data_pago":p.data_pago.strftime("%d/%m/%Y") if p.data_pago else None,
            "status":   "pago" if p.pago else (
                        "vencido" if p.vencimento < hoje else (
                        "proximo" if (p.vencimento - hoje).days <= 5 else "ok")),
        } for p in sorted(v.parcelas, key=lambda x: x.numero)]
        vendas.append({
            "id": v.id, "descricao": v.descricao,
            "valor_total": v.valor_total, "modo_pagamento": v.modo_pagamento,
            "parcelado": v.parcelado, "num_parcelas": v.num_parcelas,
            "valor_parcela": v.valor_parcela,
            "data_venda":      v.data_venda.strftime("%d/%m/%Y") if v.data_venda else None,
            "data_vencimento": v.data_vencimento.strftime("%d/%m/%Y") if v.data_vencimento else None,
            "status_pagamento": v.status_pagamento, "observacao": v.observacao,
            "parcelas": parcelas,
        })
    return {
        "id": c.id, "nome": c.nome, "email": c.email, "telefone": c.telefone,
        "cpf": c.cpf, "endereco": c.endereco, "cidade": c.cidade, "cep": c.cep,
        "observacao": c.observacao,
        "criado_em": c.criado_em.strftime("%d/%m/%Y") if c.criado_em else None,
        "vendedor": c.usuario_rel.nome if c.usuario_rel else None,
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
        observacao=dados.observacao, tenant_id=tid(ctx),
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
    # verifica tenant da venda
    if not ctx["admin"] and p.venda_rel.tenant_id != ctx["tenant_id"]:
        raise HTTPException(403, "Acesso negado")
    p.pago = True
    p.data_pago = datetime.strptime(dados.data_pago, "%Y-%m-%d").date() if dados.data_pago else date.today()
    if all(parc.pago for parc in p.venda_rel.parcelas):
        p.venda_rel.status_pagamento = "pago"
    db.commit()
    return {"mensagem": "Parcela marcada como paga"}

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