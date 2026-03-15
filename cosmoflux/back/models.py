from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey, Float, DateTime, Text, Date
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.orm import Session, sessionmaker
from datetime import datetime, timedelta
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///banco.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite precisa de check_same_thread, PostgreSQL não aceita esse argumento
if DATABASE_URL.startswith("sqlite"):
    db = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    db = create_engine(DATABASE_URL)

Base = declarative_base()


class Tenant(Base):
    """Representa uma empresa/conta no sistema."""
    __tablename__ = "tenants"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    nome      = Column(String, nullable=False)
    ativo     = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    usuarios  = relationship("Usuario", back_populates="tenant_rel")
    def __init__(self, nome): self.nome = nome


class Usuario(Base):
    __tablename__ = "usuarios"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    nome      = Column(String, nullable=False)
    email     = Column(String, nullable=False, unique=True)
    senha     = Column(String, nullable=False)
    ativo     = Column(Boolean, default=True)
    admin     = Column(Boolean, default=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    tenant_rel = relationship("Tenant", back_populates="usuarios")
    def __init__(self, nome, email, senha, ativo=True, admin=False, tenant_id=None):
        self.nome=nome; self.email=email; self.senha=senha
        self.ativo=ativo; self.admin=admin; self.tenant_id=tenant_id


class Categoria(Base):
    __tablename__ = "categorias"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    nome      = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    produtos  = relationship("Produto", back_populates="categoria_rel")
    def __init__(self, nome, tenant_id=None):
        self.nome=nome; self.tenant_id=tenant_id


class Fornecedor(Base):
    __tablename__ = "fornecedores"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    nome      = Column(String, nullable=False)
    contato   = Column(String)
    email     = Column(String)
    telefone  = Column(String)
    ativo     = Column(Boolean, default=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    produtos  = relationship("Produto", back_populates="fornecedor_rel")
    def __init__(self, nome, contato=None, email=None, telefone=None, tenant_id=None):
        self.nome=nome; self.contato=contato; self.email=email
        self.telefone=telefone; self.tenant_id=tenant_id


class Produto(Base):
    __tablename__ = "produtos"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    nome           = Column(String, nullable=False)
    descricao      = Column(Text)
    sku            = Column(String)
    codigo_barras  = Column(String)
    categoria_id   = Column(Integer, ForeignKey("categorias.id"))
    fornecedor_id  = Column(Integer, ForeignKey("fornecedores.id"))
    preco_custo    = Column(Float, default=0.0)
    preco_venda    = Column(Float, default=0.0)
    estoque_atual  = Column(Integer, default=0)
    estoque_minimo = Column(Integer, default=5)
    unidade        = Column(String, default="un")
    ativo          = Column(Boolean, default=True)
    tenant_id      = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    criado_em      = Column(DateTime, default=datetime.utcnow)
    categoria_rel  = relationship("Categoria",   back_populates="produtos")
    fornecedor_rel = relationship("Fornecedor",  back_populates="produtos")
    movimentacoes  = relationship("Movimentacao",back_populates="produto_rel")
    itens_pedido   = relationship("ItemPedido",  back_populates="produto_rel")
    def __init__(self, nome, preco_venda, preco_custo=0, estoque_atual=0, estoque_minimo=5,
                 categoria_id=None, fornecedor_id=None, descricao=None, sku=None,
                 codigo_barras=None, unidade="un", tenant_id=None):
        self.nome=nome; self.descricao=descricao; self.sku=sku; self.codigo_barras=codigo_barras
        self.categoria_id=categoria_id; self.fornecedor_id=fornecedor_id
        self.preco_custo=preco_custo; self.preco_venda=preco_venda
        self.estoque_atual=estoque_atual; self.estoque_minimo=estoque_minimo
        self.unidade=unidade; self.tenant_id=tenant_id


class Movimentacao(Base):
    __tablename__ = "movimentacoes"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    tipo       = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False)
    motivo          = Column(String)
    observacao      = Column(Text)
    preco_custo_real= Column(Float, nullable=True)  # custo real desta entrada (opcional)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    tenant_id  = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    criado_em  = Column(DateTime, default=datetime.utcnow)
    produto_rel = relationship("Produto",  back_populates="movimentacoes")
    usuario_rel = relationship("Usuario")
    def __init__(self, produto_id, tipo, quantidade, motivo=None, observacao=None,
                 usuario_id=None, tenant_id=None, preco_custo_real=None):
        self.produto_id=produto_id; self.tipo=tipo; self.quantidade=quantidade
        self.motivo=motivo; self.observacao=observacao
        self.usuario_id=usuario_id; self.tenant_id=tenant_id
        self.preco_custo_real=preco_custo_real


class Cliente(Base):
    __tablename__ = "clientes"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    nome       = Column(String, nullable=False)
    email      = Column(String)
    telefone   = Column(String)
    cpf        = Column(String)
    endereco   = Column(String)
    cidade     = Column(String)
    cep        = Column(String)
    observacao = Column(Text)
    ativo      = Column(Boolean, default=True)
    tenant_id  = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    criado_em  = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    pedidos    = relationship("Pedido", back_populates="cliente_rel")
    vendas     = relationship("Venda",  back_populates="cliente_rel")
    usuario_rel= relationship("Usuario")
    def __init__(self, nome, email=None, telefone=None, cpf=None, endereco=None,
                 cidade=None, cep=None, observacao=None, usuario_id=None, tenant_id=None):
        self.nome=nome; self.email=email; self.telefone=telefone; self.cpf=cpf
        self.endereco=endereco; self.cidade=cidade; self.cep=cep
        self.observacao=observacao; self.usuario_id=usuario_id; self.tenant_id=tenant_id


class Venda(Base):
    __tablename__ = "vendas"
    id               = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id       = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id       = Column(Integer, ForeignKey("usuarios.id"))
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    descricao        = Column(String)
    valor_total      = Column(Float, nullable=False)
    modo_pagamento   = Column(String, nullable=False)
    parcelado        = Column(Boolean, default=False)
    num_parcelas     = Column(Integer, default=1)
    valor_parcela    = Column(Float)
    data_venda       = Column(Date, default=datetime.utcnow().date)
    data_vencimento  = Column(Date)
    status_pagamento = Column(String, default="pendente")
    observacao       = Column(Text)
    criado_em        = Column(DateTime, default=datetime.utcnow)
    cliente_rel = relationship("Cliente", back_populates="vendas")
    usuario_rel = relationship("Usuario")
    parcelas    = relationship("Parcela", back_populates="venda_rel", cascade="all, delete-orphan")
    def __init__(self, cliente_id, valor_total, modo_pagamento, descricao=None,
                 parcelado=False, num_parcelas=1, valor_parcela=None, data_vencimento=None,
                 status_pagamento="pendente", observacao=None, usuario_id=None,
                 data_venda=None, tenant_id=None):
        self.cliente_id=cliente_id; self.usuario_id=usuario_id; self.tenant_id=tenant_id
        self.descricao=descricao; self.valor_total=valor_total; self.modo_pagamento=modo_pagamento
        self.parcelado=parcelado; self.num_parcelas=num_parcelas
        self.valor_parcela=valor_parcela or round(valor_total/max(num_parcelas,1), 2)
        self.data_venda=data_venda or datetime.utcnow().date()
        self.data_vencimento=data_vencimento; self.status_pagamento=status_pagamento
        self.observacao=observacao


class Parcela(Base):
    __tablename__ = "parcelas"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    venda_id   = Column(Integer, ForeignKey("vendas.id"), nullable=False)
    numero     = Column(Integer, nullable=False)
    valor      = Column(Float, nullable=False)
    vencimento = Column(Date, nullable=False)
    pago       = Column(Boolean, default=False)
    data_pago  = Column(Date)
    observacao = Column(Text)
    venda_rel  = relationship("Venda", back_populates="parcelas")
    def __init__(self, venda_id, numero, valor, vencimento, pago=False):
        self.venda_id=venda_id; self.numero=numero; self.valor=valor
        self.vencimento=vencimento; self.pago=pago


class Pedido(Base):
    __tablename__ = "pedidos"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    tenant_id  = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    status     = Column(String, default="pendente")
    total      = Column(Float, default=0.0)
    desconto   = Column(Float, default=0.0)
    observacao = Column(Text)
    criado_em  = Column(DateTime, default=datetime.utcnow)
    cliente_rel = relationship("Cliente",   back_populates="pedidos")
    usuario_rel = relationship("Usuario")
    itens       = relationship("ItemPedido",back_populates="pedido_rel")
    def __init__(self, cliente_id=None, usuario_id=None, status="pendente", total=0,
                 desconto=0, observacao=None, tenant_id=None):
        self.cliente_id=cliente_id; self.usuario_id=usuario_id; self.tenant_id=tenant_id
        self.status=status; self.total=total; self.desconto=desconto; self.observacao=observacao


class ItemPedido(Base):
    __tablename__ = "itens_pedido"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    pedido_id      = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id     = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade     = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    desconto_item  = Column(Float, default=0.0)
    pedido_rel  = relationship("Pedido",  back_populates="itens")
    produto_rel = relationship("Produto", back_populates="itens_pedido")
    def __init__(self, pedido_id, produto_id, quantidade, preco_unitario, desconto_item=0):
        self.pedido_id=pedido_id; self.produto_id=produto_id; self.quantidade=quantidade
        self.preco_unitario=preco_unitario; self.desconto_item=desconto_item


Base.metadata.create_all(bind=db)
SessionLocal = sessionmaker(bind=db)

def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()