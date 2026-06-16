from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import (Parceira, CompraParceira, ItemCompraParceira,
                    RepasseParceira, ClienteParceira, Cliente, Produto,
                    Movimentacao, Venda, Pedido, Parcela, get_db)
from auth_routes import get_ctx
from datetime import date

parceira_router = APIRouter(prefix="/api", tags=["parceiras"])

def tid(ctx): return ctx.get("tenant_id")
def tf(q, M, ctx):
    if ctx.get("admin"): return q  # admin vê tudo
    if ctx.get("tenant_id"): return q.filter(M.tenant_id == ctx["tenant_id"])
    return q

# ── Schemas ──────────────────────────────────────────────────────────
class ParceiraSchema(BaseModel):
    nome:       str
    telefone:   Optional[str] = None
    email:      Optional[str] = None
    observacao: Optional[str] = None

class ItemCompraSchema(BaseModel):
    produto_id:     int
    quantidade:     int
    preco_unitario: float

class CompraSchema(BaseModel):
    itens:      List[ItemCompraSchema]
    status_pag: str = "em_aberto"
    observacao: Optional[str] = None

class RepasseSchema(BaseModel):
    valor:      float
    observacao: Optional[str] = None

class ClienteParceiraSchema(BaseModel):
    nome:       str
    telefone:   Optional[str] = None
    observacao: Optional[str] = None

# ── PARCEIRAS CRUD ───────────────────────────────────────────────────
@parceira_router.get("/parceiras")
def listar_parceiras(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    parceiras = tf(db.query(Parceira), Parceira, ctx).filter(
        (Parceira.ativa == True) | (Parceira.ativa == None)
    ).order_by(Parceira.nome).all()
    resultado = []
    for p in parceiras:
        total_compras   = sum(c.valor_total for c in p.compras)
        total_repasses  = sum(r.valor for c in p.compras for r in c.repasses)
        saldo_em_aberto = round(total_compras - total_repasses, 2)
        resultado.append({
            "id": p.id, "nome": p.nome, "telefone": p.telefone,
            "email": p.email, "observacao": p.observacao,
            "criado_em": p.criado_em.strftime("%d/%m/%Y") if p.criado_em else None,
            "total_compras":   round(total_compras, 2),
            "total_repasses":  round(total_repasses, 2),
            "saldo_em_aberto": saldo_em_aberto,
            "num_compras":     len(p.compras),
            "num_clientes":    len(p.clientes),
            "alerta": saldo_em_aberto > 0,
        })
    return resultado

@parceira_router.post("/parceiras")
def criar_parceira(dados: ParceiraSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = Parceira(nome=dados.nome, telefone=dados.telefone, email=dados.email,
                 observacao=dados.observacao, tenant_id=tid(ctx))
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id, "mensagem": "Parceira criada"}

@parceira_router.put("/parceiras/{pid}")
def atualizar_parceira(pid: int, dados: ParceiraSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Parceira), Parceira, ctx).filter(Parceira.id == pid).first()
    if not p: raise HTTPException(404, "Parceira não encontrada")
    p.nome=dados.nome; p.telefone=dados.telefone; p.email=dados.email; p.observacao=dados.observacao
    db.commit()
    return {"mensagem": "Parceira atualizada"}

@parceira_router.delete("/parceiras/{pid}")
def deletar_parceira(pid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Parceira), Parceira, ctx).filter(Parceira.id == pid).first()
    if not p: raise HTTPException(404, "Parceira não encontrada")
    p.ativa = False; db.commit()
    return {"mensagem": "Parceira removida"}

# ── DETALHE ──────────────────────────────────────────────────────────
@parceira_router.get("/parceiras/{pid}")
def detalhe_parceira(pid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Parceira), Parceira, ctx).filter(Parceira.id == pid).first()
    if not p: raise HTTPException(404, "Parceira não encontrada")
    compras = []
    for c in sorted(p.compras, key=lambda x: x.criado_em, reverse=True):
        total_rep = sum(r.valor for r in c.repasses)
        saldo     = round(c.valor_total - total_rep, 2)
        compras.append({
            "id": c.id, "valor_total": c.valor_total,
            "status_pag": "pago" if saldo <= 0 else c.status_pag,
            "saldo": saldo, "observacao": c.observacao,
            "criado_em": c.criado_em.strftime("%d/%m/%Y %H:%M") if c.criado_em else None,
            "itens": [{
                "produto": it.produto_rel.nome if it.produto_rel else f"#{it.produto_id}",
                "quantidade": it.quantidade, "preco_unitario": it.preco_unitario,
                "subtotal": round(it.quantidade * it.preco_unitario, 2),
            } for it in c.itens],
            "repasses": [{
                "id": r.id, "valor": r.valor, "observacao": r.observacao,
                "data": r.data_repasse.strftime("%d/%m/%Y") if r.data_repasse else None,
            } for r in sorted(c.repasses, key=lambda x: x.data_repasse, reverse=True)],
        })
    clientes = [{
        "id": cl.id,
        "cliente_id": cl.cliente_id,  # id na tabela clientes (para vendas)
        "nome": cl.nome, "telefone": cl.telefone, "observacao": cl.observacao,
        "criado_em": cl.criado_em.strftime("%d/%m/%Y") if cl.criado_em else None,
    } for cl in sorted(p.clientes, key=lambda x: x.nome)]

    # ── Resumo de VENDAS feitas aos clientes desta parceira ──
    cliente_ids = [cl.cliente_id for cl in p.clientes if cl.cliente_id]
    vendas_resumo = {
        "total_vendido": 0.0, "total_recebido": 0.0, "saldo_receber": 0.0,
        "num_vendas": 0, "num_em_aberto": 0, "num_vencidas": 0,
    }
    vendas_lista = []
    if cliente_ids:
        hoje = date.today()
        vendas_q = db.query(Venda).filter(Venda.cliente_id.in_(cliente_ids)).order_by(Venda.criado_em.desc()).all()
        # mapa cliente_id -> nome do cliente da parceira
        nome_por_cid = {cl.cliente_id: cl.nome for cl in p.clientes if cl.cliente_id}
        for v in vendas_q:
            pago = sum((getattr(pc, "valor_pago", None) or 0) for pc in v.parcelas)
            saldo = round(v.valor_total - pago, 2)
            tem_vencida = any((not pc.pago and pc.vencimento and pc.vencimento < hoje) for pc in v.parcelas)
            status = "pago" if saldo <= 0.01 else ("vencido" if tem_vencida else "em_aberto")
            vendas_resumo["total_vendido"] += v.valor_total
            vendas_resumo["total_recebido"] += pago
            vendas_resumo["num_vendas"] += 1
            if status == "em_aberto": vendas_resumo["num_em_aberto"] += 1
            if status == "vencido":   vendas_resumo["num_vencidas"] += 1
            vendas_lista.append({
                "id": v.id, "cliente": nome_por_cid.get(v.cliente_id, "—"),
                "descricao": v.descricao, "valor_total": v.valor_total,
                "pago": round(pago, 2), "saldo": saldo, "status_pagamento": status,
                "modo_pagamento": v.modo_pagamento,
                "data": v.criado_em.strftime("%d/%m/%Y") if v.criado_em else None,
            })
        vendas_resumo["total_vendido"] = round(vendas_resumo["total_vendido"], 2)
        vendas_resumo["total_recebido"] = round(vendas_resumo["total_recebido"], 2)
        vendas_resumo["saldo_receber"] = round(vendas_resumo["total_vendido"] - vendas_resumo["total_recebido"], 2)

    total_compras  = sum(c["valor_total"] for c in compras)
    total_repasses = sum(r["valor"] for c in compras for r in c["repasses"])
    return {
        "id": p.id, "nome": p.nome, "telefone": p.telefone,
        "email": p.email, "observacao": p.observacao,
        "total_compras": round(total_compras, 2),
        "total_repasses": round(total_repasses, 2),
        "saldo_em_aberto": round(total_compras - total_repasses, 2),
        "compras": compras, "clientes": clientes,
        "vendas_resumo": vendas_resumo, "vendas": vendas_lista,
    }

# ── COMPRAS ──────────────────────────────────────────────────────────
@parceira_router.post("/parceiras/{pid}/compras")
def registrar_compra(pid: int, dados: CompraSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Parceira), Parceira, ctx).filter(Parceira.id == pid).first()
    if not p: raise HTTPException(404, "Parceira não encontrada")
    if not dados.itens: raise HTTPException(400, "Informe ao menos 1 produto")

    total = 0.0
    compra = CompraParceira(parceira_id=pid, usuario_id=ctx["usuario_id"],
                            tenant_id=tid(ctx), status_pag=dados.status_pag,
                            observacao=dados.observacao)
    db.add(compra); db.flush()

    for it in dados.itens:
        prod = db.query(Produto).filter(Produto.id == it.produto_id).first()
        if not prod: raise HTTPException(404, f"Produto {it.produto_id} não encontrado")
        if prod.estoque_atual < it.quantidade:
            raise HTTPException(400, f"Estoque insuficiente para '{prod.nome}' (disponível: {prod.estoque_atual})")
        subtotal = round(it.quantidade * it.preco_unitario, 2)
        total += subtotal
        db.add(ItemCompraParceira(compra_id=compra.id, produto_id=it.produto_id,
                                   quantidade=it.quantidade, preco_unitario=it.preco_unitario))
        prod.estoque_atual -= it.quantidade
        db.add(Movimentacao(produto_id=prod.id, tipo="saida", quantidade=it.quantidade,
                            motivo="venda_parceira", observacao=f"Compra parceira #{compra.id} — {p.nome}",
                            usuario_id=ctx["usuario_id"], tenant_id=tid(ctx)))

    compra.valor_total = round(total, 2)
    if dados.status_pag == "pago":
        db.add(RepasseParceira(compra_id=compra.id, parceira_id=pid,
                               tenant_id=tid(ctx), valor=round(total, 2),
                               observacao="Pago na hora"))
    db.commit()
    return {"mensagem": "Compra registrada", "id": compra.id, "total": round(total, 2)}

# ── REPASSES ─────────────────────────────────────────────────────────
@parceira_router.post("/parceiras/{pid}/compras/{cid}/repasses")
def registrar_repasse(pid: int, cid: int, dados: RepasseSchema,
                      ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    compra = db.query(CompraParceira).filter(CompraParceira.id == cid, CompraParceira.parceira_id == pid).first()
    if not compra: raise HTTPException(404, "Compra não encontrada")
    if dados.valor <= 0: raise HTTPException(400, "Valor deve ser maior que zero")
    total_rep = sum(r.valor for r in compra.repasses)
    saldo     = compra.valor_total - total_rep
    if dados.valor > saldo + 0.01:
        raise HTTPException(400, f"Valor maior que o saldo em aberto ({saldo:.2f})")
    rep = RepasseParceira(compra_id=cid, parceira_id=pid, tenant_id=tid(ctx),
                          valor=dados.valor, observacao=dados.observacao)
    db.add(rep)
    total_rep_novo = total_rep + dados.valor
    if total_rep_novo >= compra.valor_total - 0.01:
        compra.status_pag = "pago"
    db.commit()
    return {"mensagem": "Repasse registrado", "saldo_restante": round(compra.valor_total - total_rep_novo, 2)}

# ── CLIENTES DA PARCEIRA ─────────────────────────────────────────────
@parceira_router.post("/parceiras/{pid}/clientes")
def add_cliente_parceira(pid: int, dados: ClienteParceiraSchema,
                         ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    p = tf(db.query(Parceira), Parceira, ctx).filter(Parceira.id == pid).first()
    if not p: raise HTTPException(404, "Parceira não encontrada")
    cl = ClienteParceira(parceira_id=pid, tenant_id=tid(ctx),
                         nome=dados.nome, telefone=dados.telefone, observacao=dados.observacao)
    db.add(cl); db.commit(); db.refresh(cl)
    return {"id": cl.id, "mensagem": "Cliente adicionado"}

@parceira_router.delete("/parceiras/{pid}/clientes/{cid}")
def del_cliente_parceira(pid: int, cid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    cl = db.query(ClienteParceira).filter(ClienteParceira.id == cid, ClienteParceira.parceira_id == pid).first()
    if not cl: raise HTTPException(404, "Cliente não encontrado")
    db.delete(cl); db.commit()
    return {"mensagem": "Cliente removido"}