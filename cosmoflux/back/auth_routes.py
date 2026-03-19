import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from models import Usuario, Tenant, get_db

auth_router = APIRouter(prefix="/auth", tags=["auth"])
ph = PasswordHasher()

SECRET  = os.environ.get("SECRET_KEY", "cosmoflux-secret-2024-change-in-prod")
ALGO    = "HS256"

# ── Helpers ────────────────────────────────────────────────────────
def criar_token(usuario: Usuario, lembrar: bool = False) -> str:
    exp = datetime.utcnow() + (timedelta(days=30) if lembrar else timedelta(hours=8))
    payload = {
        "sub":       str(usuario.id),
        "nome":      usuario.nome,
        "email":     usuario.email,
        "admin":     usuario.admin,
        "tenant_id": usuario.tenant_id,
        "exp":       exp,
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)

def decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

def get_current_user(
    authorization: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Dependência que extrai usuário do header Authorization."""
    from fastapi import Header
    return None  # substituída abaixo com versão com Header

# ── Dependência real com Header ─────────────────────────────────────
from fastapi import Header

def get_ctx(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retorna dict com { usuario_id, tenant_id, admin }.
    Usado em todas as rotas para filtrar por tenant.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    token = authorization.split(" ", 1)[1]
    payload = decodificar_token(token)
    return {
        "usuario_id": int(payload["sub"]),
        "tenant_id":  payload.get("tenant_id"),
        "admin":      payload.get("admin", False),
        "nome":       payload.get("nome"),
    }

# ── Schemas ────────────────────────────────────────────────────────
class LoginSchema(BaseModel):
    email:      str
    senha:      str
    rememberMe: bool = False

class CadastroSchema(BaseModel):
    nome:       str
    email:      str
    senha:      str
    tenant_nome: Optional[str] = None   # se informado, cria novo tenant
    tenant_id:   Optional[int] = None   # se informado, entra em tenant existente
    admin:       bool = False

# ── Rotas ──────────────────────────────────────────────────────────
@auth_router.post("/login")
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    try:
        ph.verify(user.senha, dados.senha)
    except VerifyMismatchError:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo")

    token = criar_token(user, lembrar=dados.rememberMe)
    return {
        "token":     token,
        "nome":      user.nome,
        "email":     user.email,
        "admin":     user.admin,
        "tenant_id": user.tenant_id,
    }

@auth_router.post("/cadastro")
def cadastro(dados: CadastroSchema, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == dados.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    tenant_id = dados.tenant_id

    # Cria novo tenant se nome fornecido
    if dados.tenant_nome and not tenant_id:
        tenant = Tenant(nome=dados.tenant_nome)
        db.add(tenant)
        db.flush()
        tenant_id = tenant.id

    senha_hash = ph.hash(dados.senha)
    user = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha=senha_hash,
        admin=dados.admin,
        tenant_id=tenant_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = criar_token(user)
    return {
        "token":     token,
        "nome":      user.nome,
        "email":     user.email,
        "admin":     user.admin,
        "tenant_id": user.tenant_id,
    }

# ── Admin: listar tenants ──────────────────────────────────────────
@auth_router.get("/tenants")
def listar_tenants(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    if not ctx["admin"]:
        raise HTTPException(403, "Apenas admins podem listar tenants")
    tenants = db.query(Tenant).all()
    return [{"id": t.id, "nome": t.nome, "ativo": t.ativo,
             "usuarios": len(t.usuarios)} for t in tenants]

@auth_router.get("/usuarios")
def listar_usuarios(ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    if not ctx["admin"]:
        raise HTTPException(403, "Apenas admins")
    users = db.query(Usuario).all()
    return [{"id":u.id,"nome":u.nome,"email":u.email,"admin":u.admin,
             "tenant_id":u.tenant_id,"ativo":u.ativo} for u in users]

# ── Editar usuário (admin) ─────────────────────────────────────────
from pydantic import BaseModel as BM
class UsuarioUpdateSchema(BM):
    ativo: bool

@auth_router.put("/usuarios/{uid}")
def atualizar_usuario(uid: int, dados: UsuarioUpdateSchema, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    if not ctx["admin"]:
        raise HTTPException(403, "Apenas admins")
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    u.ativo = dados.ativo
    db.commit()
    return {"mensagem": "Usuário atualizado"}

@auth_router.delete("/usuarios/{uid}")
def deletar_usuario(uid: int, ctx: dict = Depends(get_ctx), db: Session = Depends(get_db)):
    if not ctx["admin"]:
        raise HTTPException(403, "Apenas admins")
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    if u.id == ctx["usuario_id"]:
        raise HTTPException(400, "Você não pode remover a si mesmo")
    db.delete(u)
    db.commit()
    return {"mensagem": "Usuário removido"}