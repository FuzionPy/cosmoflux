from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///banco.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app = FastAPI(title="Cosmo Flux API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Garante CORS mesmo em respostas de erro (4xx/5xx)
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def cors_error_middleware(request: Request, call_next):
    """Garante CORS mesmo quando o handler lança exceção não-tratada.
    Sem o try/except, um crash no endpoint faz o Railway devolver HTML de erro
    sem headers CORS, e o browser reporta 'no Access-Control-Allow-Origin'
    mascarando o erro real."""
    try:
        response = await call_next(request)
    except Exception as e:
        import traceback
        traceback.print_exc()  # log no Railway pra rastrear a causa
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Erro interno: {type(e).__name__}: {str(e)[:200]}"},
        )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response

from auth_routes import auth_router
from client_routes import client_router
from order_routes import order_router
from parceira_routes import parceira_router

app.include_router(auth_router)
app.include_router(client_router)
app.include_router(order_router)
app.include_router(parceira_router)

@app.on_event("startup")
def auto_migrate():
    """Aplica migrações de schema seguras na inicialização."""
    try:
        engine = create_engine(DATABASE_URL)
        migrações = [
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar TEXT",
            "ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS preco_custo_real FLOAT",
            "ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS valor_pago FLOAT DEFAULT 0",
            "ALTER TABLE parceiras ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT TRUE",
            "UPDATE parceiras SET ativa = TRUE WHERE ativa IS NULL",
            "ALTER TABLE clientes_parceira ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id)",
            # normalização Pedido ↔ Venda: vínculo real via FK em vez de parsing de texto
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES pedidos(id)",
            # preenche o vínculo em vendas antigas, lendo o id de dentro da descrição "Pedido #N"
            """UPDATE vendas
               SET pedido_id = CAST(regexp_replace(descricao, '\\D', '', 'g') AS INTEGER)
               WHERE pedido_id IS NULL
                 AND descricao ~ '^Pedido #\\d+$'
                 AND CAST(regexp_replace(descricao, '\\D', '', 'g') AS INTEGER) IN (SELECT id FROM pedidos)""",
            # retrofit: vendas em aberto SEM NENHUMA parcela ganham 1 parcela com o
            # saldo total — sem isso é impossível pagar/abater essas vendas antigas
            # (o backend antigo só criava parcelas quando havia data_vencimento).
            # Idempotente: NOT EXISTS garante que só age em quem não tem parcela.
            """INSERT INTO parcelas (venda_id, numero, valor, valor_pago, vencimento, pago)
               SELECT v.id, 1, v.valor_total, 0,
                      COALESCE(v.data_vencimento, (v.criado_em + INTERVAL '30 days')::date),
                      FALSE
               FROM vendas v
               WHERE v.status_pagamento NOT IN ('pago', 'cancelado')
                 AND NOT EXISTS (SELECT 1 FROM parcelas p WHERE p.venda_id = v.id)""",
        ]
        with engine.connect() as conn:
            for sql in migrações:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass  # coluna já existe, ignora
            conn.commit()
    except Exception as e:
        print(f"[migrate] erro: {e}")