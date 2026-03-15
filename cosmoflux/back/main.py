from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cosmo Flux API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],  # libera tudo para uso interno
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

from auth_routes import auth_router
# from product_routes import product_router
from client_routes import client_router
from order_routes  import order_router

app.include_router(auth_router)
# app.include_router(product_router)
app.include_router(client_router)
app.include_router(order_router)

# uvicorn main:app --reload