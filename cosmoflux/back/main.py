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
    response = await call_next(request)
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