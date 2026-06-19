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
    hoje = date.today()
    resultado = []
    for p in parceiras:
        total_compras   = sum(c.valor_total for c in p.compras)
        total_repasses  = sum(r.valor for c in p.compras for r in c.repasses)
        saldo_em_aberto = round(total_compras - total_repasses, 2)
        # status: atrasada (compra vencida c/ saldo) / aberto (deve no prazo) / dia (quitada)
        tem_vencida = False
        for c in p.compras:
            pago_c = sum(r.valor for r in c.repasses)
            saldo_c = c.valor_total - pago_c
            venc = (c.criado_em.date() if c.criado_em else hoje)
            # vencimento ~ 30 dias após a compra
            from datetime import timedelta
            venc30 = venc + timedelta(days=30)
            if saldo_c > 0.01 and venc30 < hoje:
                tem_vencida = True
        status = "dia" if saldo_em_aberto <= 0.01 else ("atrasada" if tem_vencida else "aberto")

        # resumo de vendas aos clientes da parceira
        cliente_ids = [cl.cliente_id for cl in p.clientes if cl.cliente_id]
        total_vendido = total_recebido = 0.0
        num_vencidas = 0
        if cliente_ids:
            vendas_q = db.query(Venda).filter(Venda.cliente_id.in_(cliente_ids)).all()
            for v in vendas_q:
                pago = sum((getattr(pc, "valor_pago", None) or 0) for pc in v.parcelas)
                total_vendido += v.valor_total
                total_recebido += pago
                if any((not pc.pago and pc.vencimento and pc.vencimento < hoje) for pc in v.parcelas):
                    num_vencidas += 1
        vendas_resumo = {
            "total_vendido": round(total_vendido, 2),
            "total_recebido": round(total_recebido, 2),
            "saldo_receber": round(total_vendido - total_recebido, 2),
            "num_vendas": len(cliente_ids), "num_vencidas": num_vencidas,
        }
        # mini avatares dos clientes (nome só)
        clientes_mini = [{"id": cl.id, "nome": cl.nome} for cl in sorted(p.clientes, key=lambda x: x.nome)]

        resultado.append({
            "id": p.id, "nome": p.nome, "telefone": p.telefone,
            "email": p.email, "observacao": p.observacao,
            "cidade": getattr(p, "cidade", None),
            "criado_em": p.criado_em.strftime("%d/%m/%Y") if p.criado_em else None,
            "total_compras":   round(total_compras, 2),
            "total_repasses":  round(total_repasses, 2),
            "saldo_em_aberto": saldo_em_aberto,
            "num_compras":     len(p.compras),
            "num_clientes":    len(p.clientes),
            "status": status,
            "alerta": tem_vencida,
            "vendas_resumo": vendas_resumo,
            "clientes_mini": clientes_mini,
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

    # Restrição 1: saldo de compras em aberto (a parceira ainda te deve)
    saldo_compras = 0.0
    for c in p.compras:
        pago = sum(r.valor for r in c.repasses)
        saldo_compras += max(c.valor_total - pago, 0)
    if saldo_compras > 0.01:
        raise HTTPException(400, f"Esta parceira tem {saldo_compras:.2f} em compras a quitar. Registre os repasses antes de excluir.")

    # Restrição 2: vendas a receber na carteira (clientes dela ainda devem)
    hoje = date.today()
    cliente_ids = [cl.cliente_id for cl in p.clientes if cl.cliente_id]
    if cliente_ids:
        vendas = db.query(Venda).filter(Venda.cliente_id.in_(cliente_ids)).all()
        saldo_receber = 0.0
        for v in vendas:
            pago = sum((getattr(pc, "valor_pago", None) or 0) for pc in v.parcelas)
            saldo_receber += max(v.valor_total - pago, 0)
        if saldo_receber > 0.01:
            raise HTTPException(400, f"A carteira desta parceira tem {saldo_receber:.2f} a receber. Quite as vendas das clientes antes de excluir.")

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
            if v.status_pagamento == "cancelado":
                status = "cancelado"
            elif saldo <= 0.01:
                status = "pago"
            elif tem_vencida:
                status = "vencido"
            else:
                status = "em_aberto"
            # parcelas detalhadas (para gerenciamento: pagar / abater)
            parcelas_v = []
            for pc in sorted(v.parcelas, key=lambda x: x.numero):
                vpago = getattr(pc, "valor_pago", None) or 0
                venc = pc.vencimento
                st = "pago" if pc.pago else ("vencido" if (venc and venc < hoje) else "em_aberto")
                dias_atr = (hoje - venc).days if (venc and venc < hoje and not pc.pago) else 0
                parcelas_v.append({
                    "id": pc.id, "numero": pc.numero, "valor": pc.valor,
                    "valor_pago": vpago, "saldo_restante": round(pc.valor - vpago, 2),
                    "pago": pc.pago, "status": st, "dias_atraso": dias_atr,
                    "vencimento": venc.strftime("%d/%m/%Y") if venc else None,
                    "vencimento_raw": venc.isoformat() if venc else None,
                    "data_pago": pc.data_pago.strftime("%d/%m/%Y") if getattr(pc, "data_pago", None) else None,
                })
            if status != "cancelado":
                vendas_resumo["total_vendido"] += v.valor_total
                vendas_resumo["total_recebido"] += pago
                vendas_resumo["num_vendas"] += 1
                if status == "em_aberto": vendas_resumo["num_em_aberto"] += 1
                if status == "vencido":   vendas_resumo["num_vencidas"] += 1
            vendas_lista.append({
                "id": v.id, "cliente": nome_por_cid.get(v.cliente_id, "—"),
                "cliente_id": v.cliente_id,
                "descricao": v.descricao, "valor_total": v.valor_total,
                "pago": round(pago, 2), "saldo": saldo, "status_pagamento": status,
                "modo_pagamento": v.modo_pagamento,
                "parcelado": len(parcelas_v) > 1, "num_parcelas": len(parcelas_v),
                "parcelas": parcelas_v,
                "observacao": v.observacao,
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
    # cria também um Cliente real (tabela clientes) para que vendas funcionem
    cliente_real = Cliente(nome=dados.nome, telefone=dados.telefone,
                           observacao=f"Cliente da parceira {p.nome}", tenant_id=tid(ctx))
    db.add(cliente_real); db.flush()  # gera o id sem fechar a transação
    cl = ClienteParceira(parceira_id=pid, tenant_id=tid(ctx),
                         nome=dados.nome, telefone=dados.telefone, observacao=dados.observacao,
                         cliente_id=cliente_real.id)
    db.add(cl); db.commit(); db.refresh(cl)
    return {"id": cl.id, "cliente_id": cliente_real.id, "mensagem": "Cliente adicionado"}

@parceira_router.delete("/parceiras/{pid}/clientes/{cid}")
def del_cliente_parceira(pid: int, cid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    cl = db.query(ClienteParceira).filter(ClienteParceira.id == cid, ClienteParceira.parceira_id == pid).first()
    if not cl: raise HTTPException(404, "Cliente não encontrado")
    db.delete(cl); db.commit()
    return {"mensagem": "Cliente removido"}

@parceira_router.post("/parceiras/{pid}/clientes/{cid}/vincular")
def vincular_cliente_parceira(pid: int, cid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    """Cria um Cliente real e vincula a uma ClienteParceira que ainda não tem cliente_id.
    Usado para 'consertar' clientes cadastrados antes do vínculo automático."""
    cl = db.query(ClienteParceira).filter(ClienteParceira.id == cid, ClienteParceira.parceira_id == pid).first()
    if not cl: raise HTTPException(404, "Cliente não encontrado")
    if cl.cliente_id:
        return {"cliente_id": cl.cliente_id, "mensagem": "Já vinculado"}
    p = db.query(Parceira).filter(Parceira.id == pid).first()
    cliente_real = Cliente(nome=cl.nome, telefone=cl.telefone,
                           observacao=f"Cliente da parceira {p.nome if p else ''}", tenant_id=tid(ctx))
    db.add(cliente_real); db.flush()
    cl.cliente_id = cliente_real.id
    db.commit()
    return {"cliente_id": cliente_real.id, "mensagem": "Vínculo criado"}