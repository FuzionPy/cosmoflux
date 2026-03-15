"""
Adiciona coluna preco_custo_real na tabela movimentacoes.
Execute UMA VEZ: python migrate_custo_real.py
"""
import sqlite3, os

BASE = os.path.dirname(os.path.abspath(__file__))
conn = sqlite3.connect(os.path.join(BASE, "banco.db"))
cur  = conn.cursor()

try:
    cur.execute("ALTER TABLE movimentacoes ADD COLUMN preco_custo_real REAL")
    print("✅ Coluna preco_custo_real adicionada em movimentacoes")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e):
        print("~ Coluna já existe, nada a fazer.")
    else:
        raise

conn.commit()
conn.close()
print("Concluído!")