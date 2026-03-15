from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import (Produto, Categoria, Fornecedor, Movimentacao,
                    Cliente, Pedido, ItemPedido, get_db)

product_router = APIRouter(prefix="/api", tags=["sistema"])

# ══════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════

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

class MovimentacaoSchema(BaseModel):
    produto_id: int
    tipo: str          # "entrada" | "saida" | "ajuste"
    quantidade: int
    motivo: Optional[str] = None
    observacao: Optional[str] = None
    usuario_id: Optional[int] = None

class CategoriaSchema(BaseModel):
    nome: str

class FornecedorSchema(BaseModel):
    nome: str
    contato: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None

class ClienteSchema(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None

class ItemPedidoSchema(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float
    desconto_item: float = 0

class PedidoSchema(BaseModel):
    cliente_id: Optional[int] = None
    usuario_id: Optional[int] = None
    status: str = "pendente"
    desconto: float = 0
    observacao: Optional[str] = None
    itens: List[ItemPedidoSchema]

# ══════════════════════════════════════════════════════════════════
# KPIs / DASHBOARD
# ══════════════════════════════════════════════════════════════════

@product_router.get("/dashboard/kpis")
def get_kpis(db: Session = Depends(get_db)):
    total_produtos = db.query(Produto).filter(Produto.ativo == True).count()

    # Receita do mês (pedidos entregues/confirmados)
    mes_atual = datetime.utcnow().month
    ano_atual = datetime.utcnow().year
    receita = db.query(func.sum(Pedido.total)).filter(
        func.strftime('%m', Pedido.criado_em) == f"{mes_atual:02d}",
        func.strftime('%Y', Pedido.criado_em) == str(ano_atual),
        Pedido.status.in_(["confirmado", "entregue"])
    ).scalar() or 0

    # Total de pedidos hoje
    hoje = datetime.utcnow().date().isoformat()
    pedidos_hoje = db.query(Pedido).filter(
        func.date(Pedido.criado_em) == hoje
    ).count()

    # Produtos com estoque crítico
    criticos = db.query(Produto).filter(
        Produto.estoque_atual <= Produto.estoque_minimo,
        Produto.ativo == True
    ).count()

    # Lucro estimado do mês
    lucro = db.query(
        func.sum((Produto.preco_venda - Produto.preco_custo) * ItemPedido.quantidade)
    ).join(ItemPedido, ItemPedido.produto_id == Produto.id)\
     .join(Pedido, Pedido.id == ItemPedido.pedido_id)\
     .filter(
        func.strftime('%m', Pedido.criado_em) == f"{mes_atual:02d}",
        func.strftime('%Y', Pedido.criado_em) == str(ano_atual),
        Pedido.status.in_(["confirmado", "entregue"])
    ).scalar() or 0

    return {
        "receita_mes": round(receita, 2),
        "pedidos_hoje": pedidos_hoje,
        "total_produtos": total_produtos,
        "lucro_mes": round(lucro, 2),
        "estoque_critico": criticos,
    }

@product_router.get("/dashboard/vendas-por-mes")
def vendas_por_mes(db: Session = Depends(get_db)):
    resultado = db.query(
        func.strftime('%m', Pedido.criado_em).label("mes"),
        func.count(Pedido.id).label("total")
    ).filter(
        func.strftime('%Y', Pedido.criado_em) == str(datetime.utcnow().year)
    ).group_by("mes").all()

    meses = {f"{i:02d}": 0 for i in range(1, 13)}
    for row in resultado:
        meses[row.mes] = row.total

    return [{"mes": m, "total": v} for m, v in meses.items()]

# ══════════════════════════════════════════════════════════════════
# PRODUTOS
# ══════════════════════════════════════════════════════════════════

@product_router.get("/produtos")
def listar_produtos(db: Session = Depends(get_db)):
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    return [
        {
            "id": p.id,
            "nome": p.nome,
            "sku": p.sku,
            "descricao": p.descricao,
            "preco_venda": p.preco_venda,
            "preco_custo": p.preco_custo,
            "estoque_atual": p.estoque_atual,
            "estoque_minimo": p.estoque_minimo,
            "unidade": p.unidade,
            "categoria": p.categoria_rel.nome if p.categoria_rel else None,
            "fornecedor": p.fornecedor_rel.nome if p.fornecedor_rel else None,
            "status": (
                "esgotado" if p.estoque_atual == 0
                else "critico" if p.estoque_atual <= p.estoque_minimo
                else "ok"
            )
        }
        for p in produtos
    ]

@product_router.post("/produtos")
def criar_produto(dados: ProdutoSchema, db: Session = Depends(get_db)):
    produto = Produto(**dados.model_dump())
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return {"mensagem": "Produto criado", "id": produto.id}

@product_router.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, dados: ProdutoSchema, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for k, v in dados.model_dump().items():
        setattr(produto, k, v)
    db.commit()
    return {"mensagem": "Produto atualizado"}

@product_router.delete("/produtos/{produto_id}")
def deletar_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto.ativo = False  # soft delete
    db.commit()
    return {"mensagem": "Produto removido"}

# ══════════════════════════════════════════════════════════════════
# ESTOQUE / MOVIMENTAÇÕES
# ══════════════════════════════════════════════════════════════════

@product_router.get("/estoque/alertas")
def alertas_estoque(db: Session = Depends(get_db)):
    produtos = db.query(Produto).filter(
        Produto.estoque_atual <= Produto.estoque_minimo,
        Produto.ativo == True
    ).all()
    return [
        {
            "id": p.id,
            "nome": p.nome,
            "estoque_atual": p.estoque_atual,
            "estoque_minimo": p.estoque_minimo,
            "status": "esgotado" if p.estoque_atual == 0 else "critico"
        }
        for p in produtos
    ]

@product_router.post("/movimentacoes")
def registrar_movimentacao(dados: MovimentacaoSchema, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == dados.produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if dados.tipo == "entrada":
        produto.estoque_atual += dados.quantidade
    elif dados.tipo == "saida":
        if produto.estoque_atual < dados.quantidade:
            raise HTTPException(status_code=400, detail="Estoque insuficiente")
        produto.estoque_atual -= dados.quantidade
    elif dados.tipo == "ajuste":
        produto.estoque_atual = dados.quantidade

    mov = Movimentacao(**dados.model_dump())
    db.add(mov)
    db.commit()
    return {"mensagem": "Movimentação registrada", "estoque_atual": produto.estoque_atual}

@product_router.get("/movimentacoes")
def listar_movimentacoes(limite: int = 20, db: Session = Depends(get_db)):
    movs = db.query(Movimentacao).order_by(Movimentacao.criado_em.desc()).limit(limite).all()
    return [
        {
            "id": m.id,
            "produto": m.produto_rel.nome if m.produto_rel else None,
            "tipo": m.tipo,
            "quantidade": m.quantidade,
            "motivo": m.motivo,
            "observacao": m.observacao,
            "data": m.criado_em.strftime("%d/%m/%Y %H:%M"),
        }
        for m in movs
    ]

# ══════════════════════════════════════════════════════════════════
# CATEGORIAS
# ══════════════════════════════════════════════════════════════════

@product_router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    return [{"id": c.id, "nome": c.nome} for c in db.query(Categoria).all()]

@product_router.post("/categorias")
def criar_categoria(dados: CategoriaSchema, db: Session = Depends(get_db)):
    cat = Categoria(nome=dados.nome)
    db.add(cat)
    db.commit()
    return {"mensagem": "Categoria criada", "id": cat.id}

# ══════════════════════════════════════════════════════════════════
# FORNECEDORES
# ══════════════════════════════════════════════════════════════════

@product_router.get("/fornecedores")
def listar_fornecedores(db: Session = Depends(get_db)):
    return [
        {"id": f.id, "nome": f.nome, "email": f.email, "telefone": f.telefone}
        for f in db.query(Fornecedor).filter(Fornecedor.ativo == True).all()
    ]

@product_router.post("/fornecedores")
def criar_fornecedor(dados: FornecedorSchema, db: Session = Depends(get_db)):
    forn = Fornecedor(**dados.model_dump())
    db.add(forn)
    db.commit()
    return {"mensagem": "Fornecedor criado", "id": forn.id}

# ══════════════════════════════════════════════════════════════════
# CLIENTES
# ══════════════════════════════════════════════════════════════════

@product_router.get("/clientes")
def listar_clientes(db: Session = Depends(get_db)):
    return [
        {"id": c.id, "nome": c.nome, "email": c.email, "telefone": c.telefone}
        for c in db.query(Cliente).filter(Cliente.ativo == True).all()
    ]

@product_router.post("/clientes")
def criar_cliente(dados: ClienteSchema, db: Session = Depends(get_db)):
    cliente = Cliente(**dados.model_dump())
    db.add(cliente)
    db.commit()
    return {"mensagem": "Cliente criado", "id": cliente.id}

# ══════════════════════════════════════════════════════════════════
# PEDIDOS
# ══════════════════════════════════════════════════════════════════

@product_router.get("/pedidos")
def listar_pedidos(db: Session = Depends(get_db)):
    pedidos = db.query(Pedido).order_by(Pedido.criado_em.desc()).limit(50).all()
    return [
        {
            "id": p.id,
            "cliente": p.cliente_rel.nome if p.cliente_rel else "Balcão",
            "status": p.status,
            "total": p.total,
            "itens": len(p.itens),
            "data": p.criado_em.strftime("%d/%m/%Y %H:%M"),
        }
        for p in pedidos
    ]

@product_router.post("/pedidos")
def criar_pedido(dados: PedidoSchema, db: Session = Depends(get_db)):
    total = sum(
        (item.preco_unitario * item.quantidade) - item.desconto_item
        for item in dados.itens
    ) - dados.desconto

    pedido = Pedido(
        cliente_id=dados.cliente_id,
        usuario_id=dados.usuario_id,
        status=dados.status,
        total=round(total, 2),
        desconto=dados.desconto,
        observacao=dados.observacao,
    )
    db.add(pedido)
    db.flush()

    for item in dados.itens:
        # baixa automática do estoque
        produto = db.query(Produto).filter(Produto.id == item.produto_id).first()
        if produto:
            if produto.estoque_atual < item.quantidade:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {produto.nome}")
            produto.estoque_atual -= item.quantidade

        db.add(ItemPedido(
            pedido_id=pedido.id,
            produto_id=item.produto_id,
            quantidade=item.quantidade,
            preco_unitario=item.preco_unitario,
            desconto_item=item.desconto_item,
        ))

        # registra movimentação automática
        db.add(Movimentacao(
            produto_id=item.produto_id,
            tipo="saida",
            quantidade=item.quantidade,
            motivo="venda",
            observacao=f"Pedido #{pedido.id}",
        ))

    db.commit()
    return {"mensagem": "Pedido criado", "id": pedido.id, "total": pedido.total}

@product_router.patch("/pedidos/{pedido_id}/status")
def atualizar_status_pedido(pedido_id: int, status: str, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    pedido.status = status
    db.commit()
    return {"mensagem": "Status atualizado"}