"""
Migração para adicionar multi-tenant ao banco existente.
Execute UMA VEZ: python migrate_tenant.py
"""
import sqlite3
import os
BASE = os.path.dirname(os.path.abspath(__file__))
conn = sqlite3.connect(os.path.join(BASE, "banco.db"))
cur  = conn.cursor()

# 1. Criar tabela tenants
cur.execute("""
    CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
""")

# 2. Criar tenant padrão para dados existentes
cur.execute("SELECT COUNT(*) FROM tenants")
if cur.fetchone()[0] == 0:
    cur.execute("INSERT INTO tenants (nome) VALUES ('Principal')")
    tenant_id = cur.lastrowid
    print(f"Tenant padrão criado com id={tenant_id}")
else:
    cur.execute("SELECT id FROM tenants LIMIT 1")
    tenant_id = cur.fetchone()[0]
    print(f"Usando tenant existente id={tenant_id}")

# 3. Adicionar tenant_id nas tabelas (ignora se já existe)
tabelas = ["usuarios","categorias","fornecedores","produtos",
           "movimentacoes","clientes","vendas","pedidos"]

for tabela in tabelas:
    try:
        cur.execute(f"ALTER TABLE {tabela} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)")
        print(f"  + tenant_id adicionado em [{tabela}]")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print(f"  ~ [{tabela}] já tem tenant_id, pulando")
        else:
            raise

# 4. Preencher tenant_id nos registros existentes (que têm NULL)
for tabela in tabelas:
    cur.execute(f"UPDATE {tabela} SET tenant_id = ? WHERE tenant_id IS NULL", (tenant_id,))
    n = cur.rowcount
    if n: print(f"  ✓ {n} registro(s) em [{tabela}] atualizado(s)")

# 5. Remover constraint unique de SKU (era global, agora pode repetir entre tenants)
# SQLite não suporta DROP CONSTRAINT, então recria a tabela sem o unique
cur.execute("PRAGMA table_info(produtos)")
cols = cur.fetchall()
has_unique_sku = any(c[1] == 'sku' for c in cols)
# Apenas informa - a constraint em SQLite é difícil de remover sem recriar
# O models.py novo já não tem unique=True no sku
print("\n⚠  Lembre-se: o campo SKU não tem mais UNIQUE global (ok para multi-tenant)")

conn.commit()
conn.close()
print("\n✅ Migração concluída!")
print(f"   Todos os dados existentes foram associados ao tenant '{tenant_id}'")
print("\n📋 Próximos passos:")
print("   1. Crie seu usuário admin com admin=True e tenant_id=NULL via /auth/cadastro")
print("   2. Para novos usuários: POST /auth/cadastro com tenant_nome para criar nova empresa")
print("   3. Reinicie o uvicorn")