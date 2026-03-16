from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///banco.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app = FastAPI(title="Cosmo Flux API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=[
        "https://cosmoflux.vercel.app",  # ✅ produção
        "http://localhost:3000",           # ✅ desenvolvimento local
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from auth_routes import auth_router
from client_routes import client_router
from order_routes import order_router

app.include_router(auth_router)
app.include_router(client_router)
app.include_router(order_router)