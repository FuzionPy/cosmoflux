from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from models import Produto, Movimentacao, Cliente, Pedido, ItemPedido, get_db, Categoria, Fornecedor, Venda
from sqlalchemy import func, desc
from auth_routes import get_ctx

order_router = APIRouter(prefix="/api", tags=["operacoes"])

# ── helpers ────────────────────────────────────────────────────────
def tf(q, model, ctx):
    """Aplica filtro de tenant se não for admin."""
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        return q.filter(model.tenant_id == ctx["tenant_id"])
    return q

def tid(ctx):
    """Retorna tenant_id ou None (admin)."""
    return None if ctx["admin"] else ctx.get("tenant_id")

def fmt_dt_local(dt):
    """Formata um datetime UTC (como salvo no banco) para o fuso de Brasília
    (UTC-3) no formato dd/mm/aaaa HH:MM. Sem isso, horários aparecem ~3h
    adiantados (ex: 23:32 do dia 29 vira 02:32 do dia 30)."""
    if not dt:
        return None
    return (dt - timedelta(hours=3)).strftime("%d/%m/%Y %H:%M")

# ══════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════
class ItemPedidoSchema(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float
    desconto_item: float = 0.0

class PedidoSchema(BaseModel):
    cliente_id: Optional[int] = None
    itens: List[ItemPedidoSchema]
    desconto: float = 0.0
    observacao: Optional[str] = None

class MovimentacaoSchema(BaseModel):
    produto_id: int
    tipo: str
    quantidade: int
    motivo: Optional[str] = None
    observacao: Optional[str] = None
    preco_custo_real: Optional[float] = None  # custo real desta entrada

class ProdutoSchema(BaseModel):
    nome: str
    preco_venda: float
    preco_custo: float = 0
    estoque_atual: int = 0
    estoque_minimo: int = 5
    categoria_id: Optional[int] = None
    fornecedor_id: Optional[int] = None
    descricao: Optional[str] = None
    sku: Optional[str] = None
    unidade: str = "un"

class CategoriaSchema(BaseModel):
    nome: str

class FornecedorSchema(BaseModel):
    nome: str
    contato: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None

# ══════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════
@order_router.get("/dashboard/kpis")
def dashboard_kpis(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    hoje = datetime.utcnow().date()
    inicio_mes = hoje.replace(day=1)

    q_mes = tf(db.query(Pedido), Pedido, ctx).filter(
        Pedido.criado_em >= datetime.combine(inicio_mes, datetime.min.time()),
        Pedido.status != "cancelado"
    ).all()

    receita_mes = sum(p.total for p in q_mes)
    lucro_mes   = sum(
        sum((it.preco_unitario * it.quantidade) - custo_item(it, db) for it in p.itens)
        for p in q_mes
    )
    pedidos_hoje = tf(db.query(Pedido), Pedido, ctx).filter(
        Pedido.criado_em >= datetime.combine(hoje, datetime.min.time()), Pedido.criado_em < datetime.combine(hoje + timedelta(days=1), datetime.min.time()),
        Pedido.status != "cancelado"
    ).count()

    total_produtos  = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True).count()
    estoque_critico = tf(db.query(Produto), Produto, ctx).filter(
        Produto.ativo == True, Produto.estoque_atual <= Produto.estoque_minimo
    ).count()
    total_clientes  = tf(db.query(Cliente), Cliente, ctx).filter(Cliente.ativo == True).count()
    margem = round(lucro_mes/receita_mes*100, 1) if receita_mes else 0

    return {
        "receita_mes":     round(receita_mes, 2),
        "lucro_mes":       round(lucro_mes, 2),
        "pedidos_hoje":    pedidos_hoje,
        "total_produtos":  total_produtos,
        "estoque_critico": estoque_critico,
        "total_clientes":  total_clientes,
        "margem":          margem,
    }

@order_router.get("/dashboard/vendas-por-mes")
def vendas_por_mes(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    ano = datetime.utcnow().year
    resultado = []
    for mes in range(1, 13):
        pedidos_mes = tf(db.query(Pedido), Pedido, ctx).filter(
            func.extract('year', Pedido.criado_em) == ano,
            func.extract('month', Pedido.criado_em) == mes,
            Pedido.status != "cancelado"
        ).all()
        fat = round(sum(p.total for p in pedidos_mes), 2)
        resultado.append({"mes": mes, "total": fat, "count": len(pedidos_mes)})
    return resultado

# ══════════════════════════════════════════════════════════════════
# PRODUTOS
# ══════════════════════════════════════════════════════════════════
@order_router.get("/produtos")
def listar_produtos(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    produtos = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True).all()
    result = []
    for p in produtos:
        status = "esgotado" if p.estoque_atual == 0 else \
                 "critico"  if p.estoque_atual <= p.estoque_minimo else "ok"
        result.append({
            "id": p.id, "nome": p.nome, "descricao": p.descricao,
            "sku": p.sku, "unidade": p.unidade,
            "preco_venda": p.preco_venda, "preco_custo": p.preco_custo,
            "estoque_atual": p.estoque_atual, "estoque_minimo": p.estoque_minimo,
            "categoria_id": p.categoria_id,
            "categoria": p.categoria_rel.nome if p.categoria_rel else None,
            "fornecedor_id": p.fornecedor_id,
            "fornecedor": p.fornecedor_rel.nome if p.fornecedor_rel else None,
            "status": status,
        })
    return result

@order_router.post("/produtos")
def criar_produto(dados: ProdutoSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    q = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True)
    # verifica nome duplicado
    if q.filter(Produto.nome == dados.nome).first():
        raise HTTPException(400, f"Já existe um produto com o nome '{dados.nome}'")
    # verifica SKU duplicado (se informado)
    if dados.sku:
        if q.filter(Produto.sku == dados.sku).first():
            raise HTTPException(400, f"Já existe um produto com o SKU '{dados.sku}'")
    p = Produto(**dados.model_dump(), tenant_id=tid(ctx))
    db.add(p); db.commit(); db.refresh(p)
    return {"mensagem": "Produto criado", "id": p.id}

@order_router.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, dados: ProdutoSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == produto_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    q = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True, Produto.id != produto_id)
    # verifica nome duplicado (exceto o próprio)
    if q.filter(Produto.nome == dados.nome).first():
        raise HTTPException(400, f"Já existe outro produto com o nome '{dados.nome}'")
    # verifica SKU duplicado (exceto o próprio)
    if dados.sku:
        if q.filter(Produto.sku == dados.sku).first():
            raise HTTPException(400, f"Já existe outro produto com o SKU '{dados.sku}'")
    for k, v in dados.model_dump().items(): setattr(p, k, v)
    db.commit()
    return {"mensagem": "Produto atualizado"}

@order_router.delete("/produtos/{produto_id}")
def deletar_produto(produto_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == produto_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    p.ativo = False; db.commit()
    return {"mensagem": "Produto removido"}

# ══════════════════════════════════════════════════════════════════
# ESTOQUE / MOVIMENTAÇÕES
# ══════════════════════════════════════════════════════════════════
@order_router.get("/estoque/alertas")
def alertas_estoque(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    produtos = tf(db.query(Produto), Produto, ctx).filter(
        Produto.ativo == True, Produto.estoque_atual <= Produto.estoque_minimo
    ).all()
    return [{"id": p.id, "nome": p.nome, "estoque_atual": p.estoque_atual,
             "estoque_minimo": p.estoque_minimo, "unidade": p.unidade,
             "status": "esgotado" if p.estoque_atual == 0 else "critico"} for p in produtos]

@order_router.get("/movimentacoes")
def listar_movimentacoes(
    limite: int = Query(50), tipo: Optional[str] = Query(None),
    produto_id: Optional[int] = Query(None),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)
):
    q = tf(db.query(Movimentacao), Movimentacao, ctx)
    if tipo:       q = q.filter(Movimentacao.tipo == tipo)
    if produto_id: q = q.filter(Movimentacao.produto_id == produto_id)
    movs = q.order_by(desc(Movimentacao.criado_em)).limit(limite).all()
    return [{
        "id": m.id, "produto_id": m.produto_id,
        "produto":    m.produto_rel.nome if m.produto_rel else None,
        "tipo":       m.tipo, "quantidade": m.quantidade,
        "motivo":     m.motivo, "observacao": m.observacao,
        "preco_custo_real": m.preco_custo_real,
        "usuario":    m.usuario_rel.nome if m.usuario_rel else None,
        "data":       fmt_dt_local(m.criado_em),
        "data_raw":   m.criado_em.isoformat() if m.criado_em else None,
    } for m in movs]

@order_router.post("/movimentacoes")
def registrar_movimentacao(dados: MovimentacaoSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == dados.produto_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    if dados.tipo == "saida" and p.estoque_atual < dados.quantidade:
        raise HTTPException(400, f"Estoque insuficiente. Disponível: {p.estoque_atual}")

    mov = Movimentacao(
        produto_id=dados.produto_id, tipo=dados.tipo, quantidade=dados.quantidade,
        motivo=dados.motivo, observacao=dados.observacao,
        usuario_id=ctx["usuario_id"], tenant_id=tid(ctx),
        preco_custo_real=dados.preco_custo_real if dados.tipo == "entrada" else None,
    )
    db.add(mov)
    if dados.tipo == "entrada":   p.estoque_atual += dados.quantidade
    elif dados.tipo == "saida":   p.estoque_atual -= dados.quantidade
    elif dados.tipo == "ajuste":  p.estoque_atual  = dados.quantidade
    db.commit()
    return {"mensagem": "Movimentação registrada", "estoque_novo": p.estoque_atual}

# ══════════════════════════════════════════════════════════════════
# PEDIDOS
# ══════════════════════════════════════════════════════════════════
def calc_status_pagamento(venda, hoje):
    """Calcula status de pagamento em tempo real."""
    if not venda:
        return "pago"  # balcao sem financeiro
    if venda.status_pagamento == "cancelado":
        return "cancelado"
    parcelas = venda.parcelas
    if not parcelas:
        # sem parcelas — verifica vencimento
        if venda.data_vencimento and venda.data_vencimento < hoje:
            return "vencido"
        if venda.status_pagamento == "pago":
            return "pago"
        return "em_aberto"
    todas_pagas = all(p.pago for p in parcelas)
    if todas_pagas:
        return "pago"
    alguma_vencida = any(not p.pago and p.vencimento < hoje for p in parcelas)
    if alguma_vencida:
        return "vencido"
    return "em_aberto"

@order_router.get("/pedidos")
def listar_pedidos(
    status: Optional[str] = Query(None), limite: int = Query(50),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)
):
    from models import Venda
    q = tf(db.query(Pedido), Pedido, ctx)
    if status: q = q.filter(Pedido.status == status)
    pedidos = q.order_by(desc(Pedido.criado_em)).limit(limite).all()
    hoje = date.today()

    resultado = []
    for p in pedidos:
        venda = db.query(Venda).filter(Venda.pedido_id == p.id).first() or db.query(Venda).filter(Venda.descricao == f"Pedido #{p.id}").first()
        spag = calc_status_pagamento(venda, hoje)

        # parcelas da venda (para o modal de detalhe / abatimento)
        parcelas_out = []
        if venda:
            for pc in sorted(venda.parcelas, key=lambda x: x.numero):
                vpago = getattr(pc, "valor_pago", None) or 0
                venc = pc.vencimento
                venc_str = venc.strftime("%d/%m/%Y") if venc else None
                venc_raw = venc.isoformat() if venc else None
                st = "pago" if pc.pago else ("vencido" if (venc and venc < hoje) else "em_aberto")
                dias_atraso = (hoje - venc).days if (venc and venc < hoje and not pc.pago) else 0
                parcelas_out.append({
                    "id": pc.id, "numero": pc.numero, "valor": pc.valor,
                    "valor_pago": vpago, "saldo_restante": round(pc.valor - vpago, 2),
                    "pago": pc.pago, "status": st, "dias_atraso": dias_atraso,
                    "vencimento": venc_str, "vencimento_raw": venc_raw,
                    "data_pago": pc.data_pago.strftime("%d/%m/%Y") if getattr(pc, "data_pago", None) else None,
                })

        resultado.append({
            "id": p.id,
            "venda_id":         venda.id if venda else None,
            "cliente":          p.cliente_rel.nome if p.cliente_rel else "Balcão",
            "cliente_id":       p.cliente_id,
            "cliente_telefone": p.cliente_rel.telefone if p.cliente_rel else None,
            "status":           p.status,
            "status_pagamento": spag,
            "modo_pagamento":   venda.modo_pagamento if venda else None,
            "parcelado":        (len(parcelas_out) > 1) if venda else False,
            "num_parcelas":     len(parcelas_out),
            "data_vencimento":  (sorted(venda.parcelas, key=lambda x: x.numero)[0].vencimento.strftime("%d/%m/%Y") if venda and venda.parcelas and sorted(venda.parcelas, key=lambda x: x.numero)[0].vencimento else None),
            "total": p.total, "desconto": p.desconto, "observacao": p.observacao,
            "descricao": venda.descricao if venda else f"Pedido #{p.id}",
            "data":     fmt_dt_local(p.criado_em),
            "data_venda": p.criado_em.strftime("%d/%m/%Y") if p.criado_em else None,
            "data_raw": p.criado_em.isoformat() if p.criado_em else None,
            "num_itens": len(p.itens),
            "parcelas": parcelas_out,
            "itens": [{"produto_id": it.produto_id,
                       "produto":    it.produto_rel.nome if it.produto_rel else None,
                       "quantidade": it.quantidade,
                       "preco_unitario": it.preco_unitario,
                       "desconto_item":  it.desconto_item,
                       "subtotal": it.quantidade * it.preco_unitario - it.desconto_item,
                      } for it in p.itens],
        })
    return resultado

@order_router.post("/pedidos")
def criar_pedido(dados: PedidoSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    if not dados.itens: raise HTTPException(400, "Pedido deve ter ao menos 1 item")
    total = sum(it.quantidade * it.preco_unitario - it.desconto_item for it in dados.itens) - dados.desconto

    pedido = Pedido(
        cliente_id=dados.cliente_id, usuario_id=ctx["usuario_id"],
        status="pendente", total=round(total, 2),
        desconto=dados.desconto, observacao=dados.observacao, tenant_id=tid(ctx),
    )
    db.add(pedido); db.flush()

    for it in dados.itens:
        p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == it.produto_id).first()
        if not p: raise HTTPException(404, f"Produto {it.produto_id} não encontrado")
        if p.estoque_atual < it.quantidade:
            raise HTTPException(400, f"Estoque insuficiente para '{p.nome}'")
        db.add(ItemPedido(pedido_id=pedido.id, produto_id=it.produto_id,
                          quantidade=it.quantidade, preco_unitario=it.preco_unitario,
                          desconto_item=it.desconto_item))
        p.estoque_atual -= it.quantidade
        db.add(Movimentacao(produto_id=p.id, tipo="saida", quantidade=it.quantidade,
                            motivo="venda", observacao=f"Pedido #{pedido.id}",
                            usuario_id=ctx["usuario_id"], tenant_id=tid(ctx)))
    db.commit()
    return {"mensagem": "Pedido criado", "id": pedido.id, "total": round(total, 2)}

@order_router.patch("/pedidos/{pedido_id}/status")
def atualizar_status(pedido_id: int, status: str, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    ALLOWED = ["pendente_entrega", "entregue", "cancelado"]
    if status not in ALLOWED:
        raise HTTPException(400, f"Status inválido. Use: {', '.join(ALLOWED)}")
    pedido = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.id == pedido_id).first()
    if not pedido: raise HTTPException(404, "Pedido não encontrado")
    pedido.status = status; db.commit()
    return {"mensagem": "Status atualizado"}

@order_router.delete("/pedidos/{pedido_id}")
def cancelar_pedido(pedido_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    pedido = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.id == pedido_id).first()
    if not pedido: raise HTTPException(404, "Pedido não encontrado")
    if pedido.status == "cancelado": raise HTTPException(400, "Já cancelado")
    # cancela venda financeira vinculada
    from models import Venda
    venda = db.query(Venda).filter(Venda.pedido_id == pedido_id).first() or db.query(Venda).filter(Venda.descricao == f"Pedido #{pedido_id}").first()
    if venda: venda.status_pagamento = "cancelado"
    for it in pedido.itens:
        p = db.query(Produto).filter(Produto.id == it.produto_id).first()
        if p:
            p.estoque_atual += it.quantidade
            db.add(Movimentacao(produto_id=p.id, tipo="entrada", quantidade=it.quantidade,
                                motivo="cancelamento", observacao=f"Cancelamento pedido #{pedido_id}",
                                usuario_id=ctx["usuario_id"], tenant_id=tid(ctx)))
    pedido.status = "cancelado"; db.commit()
    return {"mensagem": "Pedido cancelado, estoque devolvido"}

# ══════════════════════════════════════════════════════════════════
# CATEGORIAS / FORNECEDORES / CLIENTES
# ══════════════════════════════════════════════════════════════════
@order_router.get("/categorias")
def listar_categorias(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    return [{"id": c.id, "nome": c.nome}
            for c in tf(db.query(Categoria), Categoria, ctx).all()]

@order_router.post("/categorias")
def criar_categoria(dados: CategoriaSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    c = Categoria(nome=dados.nome, tenant_id=tid(ctx))
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "nome": c.nome}

@order_router.delete("/categorias/{categoria_id}")
def deletar_categoria(categoria_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    c = tf(db.query(Categoria), Categoria, ctx).filter(Categoria.id == categoria_id).first()
    if not c: raise HTTPException(404, "Categoria nao encontrada")
    db.query(Produto).filter(Produto.categoria_id == categoria_id).update({"categoria_id": None})
    db.delete(c); db.commit()
    return {"mensagem": "Categoria removida"}

@order_router.get("/fornecedores")
def listar_fornecedores(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    fornecedores = tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.ativo == True).all()
    resultado = []
    for f in fornecedores:
        prods = [p for p in f.produtos if p.ativo]
        n_produtos = len(prods)
        n_criticos = sum(1 for p in prods if p.estoque_atual <= p.estoque_minimo and p.estoque_atual > 0)
        n_esgotados = sum(1 for p in prods if p.estoque_atual == 0)
        valor_estoque = round(sum((p.preco_custo or 0) * p.estoque_atual for p in prods), 2)
        resultado.append({
            "id": f.id, "nome": f.nome, "contato": f.contato,
            "telefone": f.telefone, "email": f.email,
            "n_produtos": n_produtos,
            "n_criticos": n_criticos,
            "n_esgotados": n_esgotados,
            "valor_estoque": valor_estoque,
            "precisa_reposicao": n_criticos + n_esgotados,
        })
    return sorted(resultado, key=lambda x: x["nome"])

@order_router.post("/fornecedores")
def criar_fornecedor(dados: FornecedorSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    f = Fornecedor(**dados.model_dump(), tenant_id=tid(ctx))
    db.add(f); db.commit(); db.refresh(f)
    return {"id": f.id, "nome": f.nome}

@order_router.get("/clientes")
def listar_clientes_simples(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    return [{"id": c.id, "nome": c.nome, "telefone": c.telefone}
            for c in tf(db.query(Cliente), Cliente, ctx).filter(Cliente.ativo == True).order_by(Cliente.nome).all()]

# ══════════════════════════════════════════════════════════════════
# LUCROS
# ══════════════════════════════════════════════════════════════════

def custo_medio_produto(produto_id: int, db) -> float:
    """
    Retorna o custo médio ponderado real do produto,
    usando preco_custo_real das entradas quando disponível,
    e o preco_custo padrão como fallback.
    """
    entradas = db.query(Movimentacao).filter(
        Movimentacao.produto_id == produto_id,
        Movimentacao.tipo == "entrada",
        Movimentacao.preco_custo_real != None,
    ).all()
    if entradas:
        total_qtd  = sum(e.quantidade for e in entradas)
        total_val  = sum(e.quantidade * e.preco_custo_real for e in entradas)
        return total_val / total_qtd if total_qtd else 0
    # fallback: custo padrão do produto
    p = db.query(Produto).filter(Produto.id == produto_id).first()
    return p.preco_custo if p else 0

def custo_item(it, db) -> float:
    """Custo real de um ItemPedido usando custo médio das entradas."""
    return custo_medio_produto(it.produto_id, db) * it.quantidade

@order_router.get("/lucros/resumo")
def lucros_resumo(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    hoje = datetime.utcnow().date()
    ano  = hoje.year

    def calcular(pedidos):
        receita   = sum(p.total for p in pedidos)
        custo     = sum(sum(custo_item(it, db) for it in p.itens) for p in pedidos)
        lucro     = receita - custo
        descontos = sum(p.desconto for p in pedidos)
        return round(receita,2), round(custo,2), round(lucro,2), round(descontos,2)

    inicio_mes = hoje.replace(day=1)
    ped_hoje = tf(db.query(Pedido), Pedido, ctx).filter(
        Pedido.criado_em >= datetime.combine(hoje, datetime.min.time()),
        Pedido.criado_em < datetime.combine(hoje + timedelta(days=1), datetime.min.time()),
        Pedido.status != "cancelado").all()
    ped_mes  = tf(db.query(Pedido), Pedido, ctx).filter(
        Pedido.criado_em >= datetime.combine(inicio_mes, datetime.min.time()), Pedido.status != "cancelado").all()
    ped_ano  = tf(db.query(Pedido), Pedido, ctx).filter(
        func.extract('year', Pedido.criado_em) == ano, Pedido.status != "cancelado").all()
    ped_todos= tf(db.query(Pedido), Pedido, ctx).filter(Pedido.status != "cancelado").all()

    def fmt(peds):
        r,c,l,d = calcular(peds)
        return {"receita":r,"custo":c,"lucro":l,"descontos":d,"pedidos":len(peds),
                "margem": round(l/r*100,1) if r else 0}

    return {"hoje":fmt(ped_hoje),"mes":fmt(ped_mes),"ano":fmt(ped_ano),"total":fmt(ped_todos)}

@order_router.get("/lucros/mensal")
def lucros_mensal(ano: int = None, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    ano = ano or datetime.utcnow().year
    resultado = []
    for mes in range(1, 13):
        pedidos = tf(db.query(Pedido), Pedido, ctx).filter(
            func.extract('year', Pedido.criado_em) == ano,
            func.extract('month', Pedido.criado_em) == mes,
            Pedido.status != "cancelado"
        ).all()
        receita = sum(p.total for p in pedidos)
        custo   = sum(sum(custo_item(it, db) for it in p.itens) for p in pedidos)
        lucro   = receita - custo
        resultado.append({"mes":mes,"receita":round(receita,2),"custo":round(custo,2),
                          "lucro":round(lucro,2),"pedidos":len(pedidos),
                          "margem":round(lucro/receita*100,1) if receita else 0})
    return resultado

@order_router.get("/lucros/por-produto")
def lucros_por_produto(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    itens = db.query(ItemPedido).join(ItemPedido.pedido_rel).filter(
        Pedido.status != "cancelado"
    )
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        itens = itens.filter(Pedido.tenant_id == ctx["tenant_id"])
    itens = itens.all()

    from collections import defaultdict
    agrupado = defaultdict(lambda: {"qtd":0,"receita":0.0,"custo":0.0})
    for it in itens:
        agrupado[it.produto_id]["qtd"]     += it.quantidade
        agrupado[it.produto_id]["receita"] += it.quantidade * it.preco_unitario
        agrupado[it.produto_id]["custo"]   += custo_item(it, db)

    resultado = []
    for pid, vals in agrupado.items():
        p = db.query(Produto).filter(Produto.id == pid).first()
        if not p or vals["qtd"] == 0: continue
        custo_med = custo_medio_produto(pid, db)
        lucro = vals["receita"] - vals["custo"]
        resultado.append({
            "id": p.id, "nome": p.nome,
            "categoria":    p.categoria_rel.nome if p.categoria_rel else None,
            "qtd_vendida":  vals["qtd"],
            "receita":      round(vals["receita"], 2),
            "custo":        round(vals["custo"],   2),
            "lucro":        round(lucro,            2),
            "margem":       round(lucro/vals["receita"]*100,1) if vals["receita"] else 0,
            "custo_medio":  round(custo_med, 2),
            "custo_padrao": round(p.preco_custo, 2),
            "lucro_unit":   round(p.preco_venda - custo_med, 2),
        })
    resultado.sort(key=lambda x: x["lucro"], reverse=True)
    return resultado

# ══════════════════════════════════════════════════════════════════
# FORNECEDORES (CRUD completo)
# ══════════════════════════════════════════════════════════════════
class FornecedorFullSchema(BaseModel):
    nome: str
    contato: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    ativo: bool = True

@order_router.put("/fornecedores/{fid}")
def atualizar_fornecedor(fid: int, dados: FornecedorFullSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    f = tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.id == fid).first()
    if not f: raise HTTPException(404, "Fornecedor não encontrado")
    for k, v in dados.model_dump().items(): setattr(f, k, v)
    db.commit()
    return {"mensagem": "Fornecedor atualizado"}

@order_router.delete("/fornecedores/{fid}")
def deletar_fornecedor(fid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    f = tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.id == fid).first()
    if not f: raise HTTPException(404, "Fornecedor não encontrado")
    f.ativo = False; db.commit()
    return {"mensagem": "Fornecedor removido"}

@order_router.get("/fornecedores/{fid}/produtos")
def fornecedor_produtos(fid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    f = tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.id == fid).first()
    if not f: raise HTTPException(404, "Fornecedor não encontrado")
    return [{
        "id": p.id, "nome": p.nome, "sku": p.sku,
        "preco_custo": p.preco_custo, "preco_venda": p.preco_venda,
        "estoque_atual": p.estoque_atual, "unidade": p.unidade,
        "status": "esgotado" if p.estoque_atual==0 else "critico" if p.estoque_atual<=p.estoque_minimo else "ok",
    } for p in f.produtos if p.ativo]

# ══════════════════════════════════════════════════════════════════
# RELATÓRIOS
# ══════════════════════════════════════════════════════════════════
@order_router.get("/relatorios/resumo-geral")
def resumo_geral(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    hoje = datetime.utcnow().date()
    ano  = hoje.year

    total_clientes  = tf(db.query(Cliente),  Cliente,  ctx).filter(Cliente.ativo  == True).count()
    total_produtos  = tf(db.query(Produto),  Produto,  ctx).filter(Produto.ativo  == True).count()
    total_fornecedores = tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.ativo == True).count()

    todos_pedidos = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.status != "cancelado").all()
    receita_total = sum(p.total for p in todos_pedidos)
    custo_total   = sum(sum(custo_item(it, db) for it in p.itens) for p in todos_pedidos)
    lucro_total   = receita_total - custo_total

    # valor em estoque
    produtos_list = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True).all()
    valor_estoque = sum(p.estoque_atual * p.preco_custo for p in produtos_list)
    valor_estoque_venda = sum(p.estoque_atual * p.preco_venda for p in produtos_list)

    # ticket médio
    ticket_medio = receita_total / len(todos_pedidos) if todos_pedidos else 0

    # top 5 produtos mais vendidos
    itens = db.query(ItemPedido).join(ItemPedido.pedido_rel).filter(Pedido.status != "cancelado")
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        itens = itens.filter(Pedido.tenant_id == ctx["tenant_id"])

    from collections import defaultdict
    vendas_prod = defaultdict(int)
    for it in itens.all():
        vendas_prod[it.produto_id] += it.quantidade

    top5 = sorted(vendas_prod.items(), key=lambda x: x[1], reverse=True)[:5]
    top_produtos = []
    for pid, qtd in top5:
        p = db.query(Produto).filter(Produto.id == pid).first()
        if p: top_produtos.append({"nome": p.nome, "qtd_vendida": qtd,
                                   "receita": round(qtd * p.preco_venda, 2)})

    # movimentações recentes
    movs = tf(db.query(Movimentacao), Movimentacao, ctx).order_by(
        desc(Movimentacao.criado_em)).limit(10).all()

    return {
        "totais": {
            "clientes": total_clientes,
            "produtos": total_produtos,
            "fornecedores": total_fornecedores,
            "pedidos": len(todos_pedidos),
        },
        "financeiro": {
            "receita_total":      round(receita_total, 2),
            "custo_total":        round(custo_total, 2),
            "lucro_total":        round(lucro_total, 2),
            "margem":             round(lucro_total/receita_total*100, 1) if receita_total else 0,
            "ticket_medio":       round(ticket_medio, 2),
            "valor_estoque":      round(valor_estoque, 2),
            "valor_estoque_venda":round(valor_estoque_venda, 2),
        },
        "top_produtos": top_produtos,
        "movimentacoes_recentes": [{
            "produto":    m.produto_rel.nome if m.produto_rel else None,
            "tipo":       m.tipo,
            "quantidade": m.quantidade,
            "motivo":     m.motivo,
            "data":       fmt_dt_local(m.criado_em),
        } for m in movs],
    }

@order_router.get("/relatorios/vendas-periodo")
def vendas_periodo(
    inicio:           Optional[str] = Query(None),
    fim:              Optional[str] = Query(None),
    status_entrega:   Optional[str] = Query(None),
    status_pagamento: Optional[str] = Query(None),
    modo_pagamento:   Optional[str] = Query(None),
    valor_min:        Optional[float] = Query(None),
    valor_max:        Optional[float] = Query(None),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)
):
    from models import Venda, Parcela
    from datetime import date as date_hoje

    q = tf(db.query(Pedido), Pedido, ctx)
    if inicio: q = q.filter(Pedido.criado_em >= datetime.strptime(inicio, "%Y-%m-%d"))
    if fim:    q = q.filter(Pedido.criado_em <= datetime.strptime(fim, "%Y-%m-%d").replace(hour=23,minute=59))
    if status_entrega and status_entrega != "todos":
        q = q.filter(Pedido.status == status_entrega)
    if valor_min is not None: q = q.filter(Pedido.total >= valor_min)
    if valor_max is not None: q = q.filter(Pedido.total <= valor_max)
    pedidos = q.order_by(desc(Pedido.criado_em)).all()

    def calc_st_pag(venda):
        if not venda: return "pago"
        if venda.status_pagamento == "cancelado": return "cancelado"
        parcelas = db.query(Parcela).filter(Parcela.venda_id == venda.id).all()
        if not parcelas:
            if not venda.data_vencimento: return "pago"
            return "pago" if venda.data_vencimento >= date_hoje.today() else "vencido"
        nao_pagas = [p for p in parcelas if not p.pago]
        if not nao_pagas: return "pago"
        vencidas = [p for p in nao_pagas if p.vencimento and p.vencimento < date_hoje.today()]
        return "vencido" if vencidas else "em_aberto"

    resultado = []
    for p in pedidos:
        try:
            lucro = round(sum(
                (it.preco_unitario * it.quantidade) - custo_item(it, db)
                for it in p.itens if it.produto_rel
            ), 2)
        except Exception:
            lucro = 0.0

        # busca venda financeira vinculada ao mesmo cliente
        venda = None
        if p.cliente_id:
            try:
                venda = db.query(Venda).filter(
                    Venda.cliente_id == p.cliente_id,
                    Venda.tenant_id == p.tenant_id,
                ).order_by(desc(Venda.id)).first()
            except Exception:
                venda = None

        st_pag  = "cancelado" if p.status == "cancelado" else calc_st_pag(venda)
        modo_pag = (venda.modo_pagamento if venda else None) or "—"

        if status_pagamento and status_pagamento != "todos" and st_pag != status_pagamento:
            continue
        if modo_pagamento and modo_pagamento != "todos" and modo_pag.lower() != modo_pagamento.lower():
            continue

        resultado.append({
            "id":               p.id,
            "cliente":          p.cliente_rel.nome if p.cliente_rel else "Balcão",
            "total":            p.total,
            "desconto":         p.desconto or 0,
            "status_entrega":   p.status,
            "status_pagamento": st_pag,
            "modo_pagamento":   modo_pag,
            "itens":            len(p.itens),
            "produtos":         ", ".join(it.produto_rel.nome for it in p.itens if it.produto_rel),
            "lucro":            lucro,
            "data":             p.criado_em.strftime("%d/%m/%Y") if p.criado_em else None,
            "data_raw":         p.criado_em.isoformat() if p.criado_em else None,
        })
    return resultado

@order_router.get("/relatorios/estoque-snapshot")
def estoque_snapshot(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    produtos = tf(db.query(Produto), Produto, ctx).filter(Produto.ativo == True).all()
    return [{
        "id":           p.id,
        "nome":         p.nome,
        "sku":          p.sku,
        "categoria":    p.categoria_rel.nome if p.categoria_rel else None,
        "fornecedor":   p.fornecedor_rel.nome if p.fornecedor_rel else None,
        "estoque_atual":p.estoque_atual,
        "estoque_minimo":p.estoque_minimo,
        "unidade":      p.unidade,
        "preco_custo":  p.preco_custo,
        "preco_venda":  p.preco_venda,
        "valor_estoque":round(p.estoque_atual * p.preco_custo, 2),
        "status":       "esgotado" if p.estoque_atual==0 else "critico" if p.estoque_atual<=p.estoque_minimo else "ok",
    } for p in produtos]
@order_router.get("/relatorios/produtos-mais-vendidos")
def produtos_mais_vendidos(
    dias: int = Query(30),
    mes:  Optional[int] = Query(None, ge=1, le=12),
    ano:  Optional[int] = Query(None),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db),
):
    """Se `mes` e `ano` vierem, filtra por aquele mês exato; senão usa `dias`
    a partir de hoje (comportamento antigo, para os presets 7/30/90/365)."""
    from datetime import timedelta
    q = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.status != "cancelado")
    if mes and ano:
        q = q.filter(func.extract('year', Pedido.criado_em) == ano,
                     func.extract('month', Pedido.criado_em) == mes)
    else:
        corte = datetime.utcnow() - timedelta(days=dias)
        q = q.filter(Pedido.criado_em >= corte)
    pedidos = q.all()

    contagem = {}
    for p in pedidos:
        for it in p.itens:
            pid = it.produto_id
            if pid not in contagem:
                prod = it.produto_rel
                nome = prod.nome if prod else f"Produto #{pid}"
                categoria = prod.categoria_rel.nome if (prod and prod.categoria_rel) else "Sem categoria"
                contagem[pid] = {
                    "id": pid, "nome": nome, "categoria": categoria,
                    "qtd_vendida": 0, "receita": 0.0, "custo": 0.0, "lucro": 0.0,
                }
            # usa custo médio ponderado das entradas reais (mesmo cálculo dos outros
            # endpoints de lucro) — sem isso a margem aqui divergia da tela Lucros
            contagem[pid]["qtd_vendida"] += it.quantidade
            contagem[pid]["receita"]     += round(it.quantidade * it.preco_unitario, 2)
            contagem[pid]["custo"]       += round(custo_item(it, db), 2)

    for r in contagem.values():
        r["lucro"]  = round(r["receita"] - r["custo"], 2)
        r["margem"] = round((r["lucro"] / r["receita"]) * 100, 1) if r["receita"] else 0
        r["receita"] = round(r["receita"], 2)
        r["custo"]   = round(r["custo"], 2)

    return sorted(contagem.values(), key=lambda x: x["qtd_vendida"], reverse=True)


@order_router.get("/relatorios/comparar-periodos")
def comparar_periodos(
    inicio_a: str = Query(..., description="YYYY-MM-DD"),
    fim_a:    str = Query(..., description="YYYY-MM-DD"),
    inicio_b: str = Query(..., description="YYYY-MM-DD"),
    fim_b:    str = Query(..., description="YYYY-MM-DD"),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db),
):
    """Compara métricas e produtos entre dois períodos arbitrários (A vs B).
    Usado pela aba 'Comparar' para mês vs mês, ano vs ano etc."""
    from datetime import timedelta

    def parse_range(ini, fim):
        di = datetime.strptime(ini, "%Y-%m-%d")
        df = datetime.strptime(fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        return di, df

    def periodo(ini_dt, fim_dt):
        pedidos = tf(db.query(Pedido), Pedido, ctx).filter(
            Pedido.status != "cancelado",
            Pedido.criado_em >= ini_dt, Pedido.criado_em <= fim_dt,
        ).all()
        receita = sum(p.total for p in pedidos)
        custo = 0.0
        prod_qtd = {}
        prod_receita = {}
        prod_nome = {}
        for p in pedidos:
            for it in p.itens:
                custo += custo_item(it, db)
                prod_qtd[it.produto_id]    = prod_qtd.get(it.produto_id, 0) + it.quantidade
                prod_receita[it.produto_id] = prod_receita.get(it.produto_id, 0) + it.quantidade * it.preco_unitario
                if it.produto_id not in prod_nome:
                    prod_nome[it.produto_id] = it.produto_rel.nome if it.produto_rel else f"Produto #{it.produto_id}"
        lucro = receita - custo
        return {
            "receita": round(receita, 2),
            "custo":   round(custo, 2),
            "lucro":   round(lucro, 2),
            "margem":  round(lucro/receita*100, 1) if receita else 0,
            "pedidos": len(pedidos),
            "ticket":  round(receita/len(pedidos), 2) if pedidos else 0,
            "_prod_qtd": prod_qtd, "_prod_receita": prod_receita, "_prod_nome": prod_nome,
        }

    def dias_no_range(ini_dt, fim_dt):
        return max(1, (fim_dt.date() - ini_dt.date()).days + 1)

    def serie_diaria(ini_dt, fim_dt):
        """Receita agregada por dia (do 1º ao último) — normalizada em 'offset dias'
        para permitir sobrepor períodos de tamanhos parecidos no mesmo eixo."""
        n = dias_no_range(ini_dt, fim_dt)
        pedidos = tf(db.query(Pedido), Pedido, ctx).filter(
            Pedido.status != "cancelado",
            Pedido.criado_em >= ini_dt, Pedido.criado_em <= fim_dt,
        ).all()
        serie = [0.0] * n
        for p in pedidos:
            off = (p.criado_em.date() - ini_dt.date()).days
            if 0 <= off < n:
                serie[off] += p.total
        return [round(v, 2) for v in serie]

    dia_a, dfa = parse_range(inicio_a, fim_a)
    dib, dfb = parse_range(inicio_b, fim_b)
    A = periodo(dia_a, dfa)
    B = periodo(dib, dfb)

    def delta_pct(a, b):
        if not b: return None if not a else 100.0
        return round((a - b) / b * 100, 1)

    # top 5 que mais cresceram e 5 que mais caíram (por receita)
    todos_ids = set(A["_prod_qtd"]) | set(B["_prod_qtd"])
    variacoes = []
    for pid in todos_ids:
        rec_a = A["_prod_receita"].get(pid, 0)
        rec_b = B["_prod_receita"].get(pid, 0)
        variacoes.append({
            "id": pid,
            "nome": A["_prod_nome"].get(pid) or B["_prod_nome"].get(pid) or f"Produto #{pid}",
            "qtd_a": A["_prod_qtd"].get(pid, 0), "qtd_b": B["_prod_qtd"].get(pid, 0),
            "receita_a": round(rec_a, 2), "receita_b": round(rec_b, 2),
            "delta_valor": round(rec_a - rec_b, 2),
            "delta_pct":   delta_pct(rec_a, rec_b),
        })

    sobem = sorted([v for v in variacoes if v["delta_valor"] > 0], key=lambda x: -x["delta_valor"])[:5]
    caem  = sorted([v for v in variacoes if v["delta_valor"] < 0], key=lambda x:  x["delta_valor"])[:5]

    def limpar(p):
        return {k: v for k, v in p.items() if not k.startswith("_")}

    return {
        "periodo_a": {"inicio": inicio_a, "fim": fim_a, "dias": dias_no_range(dia_a, dfa), **limpar(A)},
        "periodo_b": {"inicio": inicio_b, "fim": fim_b, "dias": dias_no_range(dib, dfb), **limpar(B)},
        "variacao": {
            "receita_pct": delta_pct(A["receita"], B["receita"]),
            "lucro_pct":   delta_pct(A["lucro"],   B["lucro"]),
            "pedidos_pct": delta_pct(A["pedidos"], B["pedidos"]),
            "ticket_pct":  delta_pct(A["ticket"],  B["ticket"]),
        },
        "serie_a": serie_diaria(dia_a, dfa),
        "serie_b": serie_diaria(dib, dfb),
        "produtos_subiram": sobem,
        "produtos_cairam":  caem,
    }


@order_router.get("/relatorios/a-receber")
def relatorio_a_receber(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    """Aging report: quem deve, quanto e há quanto tempo, agrupado em faixas.
    Usado pela aba 'A Receber'."""
    from models import Venda, Parcela
    from datetime import date as _date

    hoje = _date.today()

    def faixa(dias_atraso):
        if dias_atraso < 0:   return "a_vencer"       # ainda não venceu
        if dias_atraso <= 30: return "vencido_30"
        if dias_atraso <= 60: return "vencido_60"
        return "vencido_60_mais"

    # todas as parcelas em aberto de vendas ativas
    parcelas = db.query(Parcela).join(Parcela.venda_rel).filter(
        Parcela.pago == False,
        Venda.status_pagamento != "cancelado",
    )
    if not ctx["admin"] and ctx["tenant_id"] is not None:
        parcelas = parcelas.filter(Venda.tenant_id == ctx["tenant_id"])
    parcelas = parcelas.all()

    por_cliente = {}
    totais_faixa = {"a_vencer": 0.0, "vencido_30": 0.0, "vencido_60": 0.0, "vencido_60_mais": 0.0}

    for p in parcelas:
        venda = p.venda_rel
        if not venda or not venda.cliente_rel: continue
        cli = venda.cliente_rel
        saldo = round(p.valor - (p.valor_pago or 0), 2)
        if saldo <= 0.01: continue

        dias_atraso = (hoje - p.vencimento).days if p.vencimento else 0
        fx = faixa(dias_atraso)
        totais_faixa[fx] += saldo

        if cli.id not in por_cliente:
            por_cliente[cli.id] = {
                "id": cli.id, "nome": cli.nome, "telefone": cli.telefone,
                "saldo_total": 0.0, "parcelas_abertas": 0,
                "atraso_max": 0, "vencidas": 0, "a_vencer": 0,
                "primeira_vencida": None,
            }
        c = por_cliente[cli.id]
        c["saldo_total"] += saldo
        c["parcelas_abertas"] += 1
        if dias_atraso > 0:
            c["vencidas"] += 1
            c["atraso_max"] = max(c["atraso_max"], dias_atraso)
            if p.vencimento and (c["primeira_vencida"] is None or p.vencimento < c["primeira_vencida"]):
                c["primeira_vencida"] = p.vencimento
        else:
            c["a_vencer"] += 1

    for c in por_cliente.values():
        c["saldo_total"] = round(c["saldo_total"], 2)
        c["primeira_vencida"] = c["primeira_vencida"].strftime("%d/%m/%Y") if c["primeira_vencida"] else None

    devedores = sorted(por_cliente.values(), key=lambda x: (-x["atraso_max"], -x["saldo_total"]))

    total = sum(totais_faixa.values())
    return {
        "totais": {
            "geral": round(total, 2),
            "a_vencer":        round(totais_faixa["a_vencer"], 2),
            "vencido_30":      round(totais_faixa["vencido_30"], 2),
            "vencido_60":      round(totais_faixa["vencido_60"], 2),
            "vencido_60_mais": round(totais_faixa["vencido_60_mais"], 2),
        },
        "n_devedores": len(devedores),
        "devedores": devedores,
    }


@order_router.get("/relatorios/impacto-retroativos")
def impacto_retroativos(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    """Quantifica quanto do lucro mensal vem de pedidos RETROATIVOS (sem itens,
    custo=0, margem 100%) vs pedidos NORMAIS (com itens e custo real).
    Endpoint de diagnóstico para investigar 'lucros excessivos' em meses históricos."""
    ano = datetime.utcnow().year
    resultado = []
    for mes in range(1, 13):
        pedidos = tf(db.query(Pedido), Pedido, ctx).filter(
            func.extract('year', Pedido.criado_em) == ano,
            func.extract('month', Pedido.criado_em) == mes,
            Pedido.status != "cancelado",
        ).all()

        # separa retroativos (marcados por observação) de normais
        retro = [p for p in pedidos if p.observacao and p.observacao.startswith("[Retroativo]")]
        norm  = [p for p in pedidos if not (p.observacao and p.observacao.startswith("[Retroativo]"))]

        def bloco(lista):
            receita = sum(p.total for p in lista)
            custo   = sum(sum(custo_item(it, db) for it in p.itens) for p in lista)
            lucro   = receita - custo
            return {
                "n_pedidos": len(lista),
                "receita":   round(receita, 2),
                "custo":     round(custo, 2),
                "lucro":     round(lucro, 2),
                "margem":    round(lucro/receita*100, 1) if receita else 0,
            }

        b_retro = bloco(retro)
        b_norm  = bloco(norm)
        b_tot = {
            "n_pedidos": b_retro["n_pedidos"] + b_norm["n_pedidos"],
            "receita":   round(b_retro["receita"] + b_norm["receita"], 2),
            "custo":     round(b_retro["custo"]   + b_norm["custo"],   2),
            "lucro":     round(b_retro["lucro"]   + b_norm["lucro"],   2),
        }
        b_tot["margem"] = round(b_tot["lucro"]/b_tot["receita"]*100, 1) if b_tot["receita"] else 0
        # % do lucro que vem de retroativos (custo zero)
        b_tot["lucro_vindo_de_retroativos_pct"] = round(b_retro["lucro"]/b_tot["lucro"]*100, 1) if b_tot["lucro"] else 0

        resultado.append({"mes": mes, "retroativos": b_retro, "normais": b_norm, "total": b_tot})

    return resultado


@order_router.get("/relatorios/auditar-margem-mes")
def auditar_margem_mes(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db),
):
    """Retorna a decomposição COMPLETA do lucro do mês, item a item.
    Para cada item vendido: qual custo foi aplicado, e de ONDE ele veio
    (entradas com custo real, entradas sem custo, cadastro padrão, ou zero).
    Use para investigar margens inflacionadas."""

    pedidos = tf(db.query(Pedido), Pedido, ctx).filter(
        Pedido.status != "cancelado",
        func.extract('year', Pedido.criado_em) == ano,
        func.extract('month', Pedido.criado_em) == mes,
    ).order_by(Pedido.criado_em).all()

    def origem_do_custo(produto_id):
        """Classifica de onde vem o custo aplicado a este produto."""
        entradas = db.query(Movimentacao).filter(
            Movimentacao.produto_id == produto_id,
            Movimentacao.tipo == "entrada",
        ).all()
        if not entradas:
            return "sem_entrada_usa_cadastro"
        com_custo = [e for e in entradas if e.preco_custo_real and e.preco_custo_real > 0]
        if not com_custo:
            return "entradas_sem_custo_usa_cadastro"
        # tem entrada com custo real
        return "media_ponderada_entradas"

    itens_detalhados = []
    resumo_por_produto = {}
    origem_stats = {"media_ponderada_entradas": 0, "sem_entrada_usa_cadastro": 0,
                    "entradas_sem_custo_usa_cadastro": 0, "produto_sem_custo_cadastrado": 0,
                    "pedido_retroativo_sem_itens": 0}

    for p in pedidos:
        eh_retroativo = bool(p.observacao and p.observacao.startswith("[Retroativo]"))

        # pedidos retroativos sem itens: contabilizar separadamente
        if not p.itens:
            origem_stats["pedido_retroativo_sem_itens"] += 1
            itens_detalhados.append({
                "pedido_id": p.id, "data": p.criado_em.strftime("%d/%m/%Y"),
                "cliente": p.cliente_rel.nome if p.cliente_rel else "—",
                "eh_retroativo": eh_retroativo,
                "produto": "(pedido sem itens)",
                "sku": "—",
                "quantidade": 0,
                "preco_venda": p.total,
                "receita": round(p.total, 2),
                "custo_unit_aplicado": 0.0,
                "custo_cadastro": 0.0,
                "custo_total": 0.0,
                "lucro": round(p.total, 2),
                "margem": 100.0,
                "origem_custo": "pedido_retroativo_sem_itens",
            })
            continue

        for it in p.itens:
            prod = it.produto_rel
            preco_cadastro = (prod.preco_custo or 0) if prod else 0
            custo_aplicado_unit = custo_medio_produto(it.produto_id, db)
            custo_total = round(custo_aplicado_unit * it.quantidade, 2)
            receita_item = round(it.quantidade * it.preco_unitario, 2)
            lucro_item = round(receita_item - custo_total, 2)
            margem_item = round((lucro_item / receita_item) * 100, 1) if receita_item else 0

            origem = origem_do_custo(it.produto_id)
            if custo_aplicado_unit == 0 and preco_cadastro == 0:
                origem = "produto_sem_custo_cadastrado"
            origem_stats[origem] = origem_stats.get(origem, 0) + 1

            item_row = {
                "pedido_id": p.id, "data": p.criado_em.strftime("%d/%m/%Y"),
                "cliente": p.cliente_rel.nome if p.cliente_rel else "—",
                "eh_retroativo": eh_retroativo,
                "produto": prod.nome if prod else f"Produto #{it.produto_id}",
                "produto_id": it.produto_id,
                "sku": prod.sku if prod else "—",
                "quantidade": it.quantidade,
                "preco_venda": round(it.preco_unitario, 2),
                "receita": receita_item,
                "custo_unit_aplicado": round(custo_aplicado_unit, 2),
                "custo_cadastro": round(preco_cadastro, 2),
                "custo_total": custo_total,
                "lucro": lucro_item,
                "margem": margem_item,
                "origem_custo": origem,
            }
            itens_detalhados.append(item_row)

            # agrupamento por produto
            pid = it.produto_id
            if pid not in resumo_por_produto:
                resumo_por_produto[pid] = {
                    "produto_id": pid,
                    "nome": prod.nome if prod else f"Produto #{pid}",
                    "sku": prod.sku if prod else "—",
                    "custo_cadastro": round(preco_cadastro, 2),
                    "custo_aplicado": round(custo_aplicado_unit, 2),
                    "origem_custo": origem,
                    "qtd_vendida": 0, "receita": 0.0, "custo_total": 0.0, "lucro": 0.0,
                }
            resumo_por_produto[pid]["qtd_vendida"] += it.quantidade
            resumo_por_produto[pid]["receita"] += receita_item
            resumo_por_produto[pid]["custo_total"] += custo_total
            resumo_por_produto[pid]["lucro"] += lucro_item

    # ordena o resumo por produto por lucro absoluto (quem mais infla o total)
    produtos_lista = list(resumo_por_produto.values())
    for r in produtos_lista:
        r["receita"] = round(r["receita"], 2)
        r["custo_total"] = round(r["custo_total"], 2)
        r["lucro"] = round(r["lucro"], 2)
        r["margem"] = round((r["lucro"] / r["receita"]) * 100, 1) if r["receita"] else 0
    produtos_lista.sort(key=lambda x: -x["lucro"])

    # totalizadores
    receita_total = sum(i["receita"] for i in itens_detalhados)
    custo_total = sum(i["custo_total"] for i in itens_detalhados)
    lucro_total = receita_total - custo_total

    # produtos suspeitos: margem >= 60% e receita >= 100
    suspeitos = [r for r in produtos_lista if r["margem"] >= 60 and r["receita"] >= 100]

    return {
        "mes": mes, "ano": ano,
        "totais": {
            "n_pedidos": len(pedidos),
            "n_itens": len(itens_detalhados),
            "receita": round(receita_total, 2),
            "custo": round(custo_total, 2),
            "lucro": round(lucro_total, 2),
            "margem": round(lucro_total/receita_total*100, 1) if receita_total else 0,
        },
        "origem_custo_stats": origem_stats,
        "produtos_suspeitos": suspeitos,
        "produtos_resumo": produtos_lista,
        "itens_detalhados": itens_detalhados,
    }