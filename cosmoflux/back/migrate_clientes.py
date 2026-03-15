# reset_db.py  — rode UMA vez e delete depois
import sqlite3, os

db_path = "banco.db"

# Faz backup por segurança
if os.path.exists(db_path):
    import shutil
    shutil.copy(db_path, db_path + ".bak")
    print("Backup salvo em banco.db.bak")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.executescript("""
CREATE TABLE IF NOT EXISTS usuarios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE,
    senha     TEXT NOT NULL,
    ativo     INTEGER DEFAULT 1,
    admin     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS fornecedores (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nome     TEXT NOT NULL,
    contato  TEXT,
    email    TEXT,
    telefone TEXT,
    ativo    INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS produtos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nome           TEXT NOT NULL,
    descricao      TEXT,
    sku            TEXT UNIQUE,
    codigo_barras  TEXT,
    categoria_id   INTEGER REFERENCES categorias(id),
    fornecedor_id  INTEGER REFERENCES fornecedores(id),
    preco_custo    REAL DEFAULT 0,
    preco_venda    REAL DEFAULT 0,
    estoque_atual  INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    unidade        TEXT DEFAULT 'un',
    ativo          INTEGER DEFAULT 1,
    criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    tipo       TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    motivo     TEXT,
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL,
    email      TEXT,
    telefone   TEXT,
    cpf        TEXT,
    endereco   TEXT,
    cidade     TEXT,
    cep        TEXT,
    observacao TEXT,
    ativo      INTEGER DEFAULT 1,
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS vendas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id       INTEGER NOT NULL REFERENCES clientes(id),
    usuario_id       INTEGER REFERENCES usuarios(id),
    descricao        TEXT,
    valor_total      REAL NOT NULL,
    modo_pagamento   TEXT NOT NULL,
    parcelado        INTEGER DEFAULT 0,
    num_parcelas     INTEGER DEFAULT 1,
    valor_parcela    REAL,
    data_venda       DATE,
    data_vencimento  DATE,
    status_pagamento TEXT DEFAULT 'pendente',
    observacao       TEXT,
    criado_em        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id   INTEGER NOT NULL REFERENCES vendas(id),
    numero     INTEGER NOT NULL,
    valor      REAL NOT NULL,
    vencimento DATE NOT NULL,
    pago       INTEGER DEFAULT 0,
    data_pago  DATE,
    observacao TEXT
);

CREATE TABLE IF NOT EXISTS pedidos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER REFERENCES clientes(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    status     TEXT DEFAULT 'pendente',
    total      REAL DEFAULT 0,
    desconto   REAL DEFAULT 0,
    observacao TEXT,
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id),
    produto_id     INTEGER NOT NULL REFERENCES produtos(id),
    quantidade     INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    desconto_item  REAL DEFAULT 0
);
""")

conn.commit()
conn.close()
print("✓ Banco recriado com todas as tabelas!")
print("Agora recadastre seu usuário em /auth/cadastro")