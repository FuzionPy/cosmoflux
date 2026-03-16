from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
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
        sum((it.preco_unitario - (it.produto_rel.preco_custo or 0)) * it.quantidade for it in p.itens)
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

    return {
        "receita_mes":    round(receita_mes, 2),
        "lucro_mes":      round(lucro_mes, 2),
        "pedidos_hoje":   pedidos_hoje,
        "total_produtos": total_produtos,
        "estoque_critico":estoque_critico,
    }

@order_router.get("/dashboard/vendas-por-mes")
def vendas_por_mes(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    ano = datetime.utcnow().year
    resultado = []
    for mes in range(1, 13):
        total = tf(db.query(func.count(Pedido.id)), Pedido, ctx).filter(
            func.extract('year', Pedido.criado_em) == ano,
            func.extract('month', Pedido.criado_em) == mes,
            Pedido.status != "cancelado"
        ).scalar() or 0
        resultado.append({"mes": mes, "total": total})
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
    p = Produto(**dados.model_dump(), tenant_id=tid(ctx))
    db.add(p); db.commit(); db.refresh(p)
    return {"mensagem": "Produto criado", "id": p.id}

@order_router.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, dados: ProdutoSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Produto), Produto, ctx).filter(Produto.id == produto_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
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
        "data":       m.criado_em.strftime("%d/%m/%Y %H:%M") if m.criado_em else None,
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
@order_router.get("/pedidos")
def listar_pedidos(
    status: Optional[str] = Query(None), limite: int = Query(50),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)
):
    q = tf(db.query(Pedido), Pedido, ctx)
    if status: q = q.filter(Pedido.status == status)
    pedidos = q.order_by(desc(Pedido.criado_em)).limit(limite).all()
    return [{
        "id": p.id,
        "cliente":   p.cliente_rel.nome if p.cliente_rel else "Sem cliente",
        "cliente_id":p.cliente_id, "status": p.status,
        "total": p.total, "desconto": p.desconto, "observacao": p.observacao,
        "data":     p.criado_em.strftime("%d/%m/%Y %H:%M") if p.criado_em else None,
        "data_raw": p.criado_em.isoformat() if p.criado_em else None,
        "num_itens": len(p.itens),
        "itens": [{"produto_id": it.produto_id,
                   "produto":    it.produto_rel.nome if it.produto_rel else None,
                   "quantidade": it.quantidade,
                   "preco_unitario": it.preco_unitario,
                   "desconto_item":  it.desconto_item,
                   "subtotal": it.quantidade * it.preco_unitario - it.desconto_item,
                  } for it in p.itens],
    } for p in pedidos]

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
    pedido = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.id == pedido_id).first()
    if not pedido: raise HTTPException(404, "Pedido não encontrado")
    pedido.status = status; db.commit()
    return {"mensagem": "Status atualizado"}

@order_router.delete("/pedidos/{pedido_id}")
def cancelar_pedido(pedido_id: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    pedido = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.id == pedido_id).first()
    if not pedido: raise HTTPException(404, "Pedido não encontrado")
    if pedido.status == "cancelado": raise HTTPException(400, "Já cancelado")
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
    return [{"id": f.id, "nome": f.nome, "telefone": f.telefone, "email": f.email}
            for f in tf(db.query(Fornecedor), Fornecedor, ctx).filter(Fornecedor.ativo == True).all()]

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
    custo_total   = sum(sum((it.produto_rel.preco_custo or 0)*it.quantidade for it in p.itens) for p in todos_pedidos)
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
            "data":       m.criado_em.strftime("%d/%m/%Y %H:%M") if m.criado_em else None,
        } for m in movs],
    }

@order_router.get("/relatorios/vendas-periodo")
def vendas_periodo(
    inicio: Optional[str] = Query(None),  # YYYY-MM-DD
    fim:    Optional[str] = Query(None),
    ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)
):
    q = tf(db.query(Pedido), Pedido, ctx).filter(Pedido.status != "cancelado")
    if inicio: q = q.filter(Pedido.criado_em >= datetime.strptime(inicio, "%Y-%m-%d"))
    if fim:    q = q.filter(Pedido.criado_em <= datetime.strptime(fim, "%Y-%m-%d").replace(hour=23,minute=59))
    pedidos = q.order_by(desc(Pedido.criado_em)).all()

    return [{
        "id":      p.id,
        "cliente": p.cliente_rel.nome if p.cliente_rel else "—",
        "total":   p.total,
        "desconto":p.desconto,
        "status":  p.status,
        "itens":   len(p.itens),
        "lucro":   round(sum((it.preco_unitario-(it.produto_rel.preco_custo or 0))*it.quantidade for it in p.itens), 2),
        "data":    p.criado_em.strftime("%d/%m/%Y") if p.criado_em else None,
        "data_raw":p.criado_em.isoformat() if p.criado_em else None,
    } for p in pedidos]

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