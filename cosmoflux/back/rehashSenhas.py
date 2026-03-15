"""
Converte senhas bcrypt existentes para argon2.
Execute: python rehash_senhas.py
Informe a senha de cada usuário quando solicitado.
"""
import sqlite3, os
from argon2 import PasswordHasher

ph = PasswordHasher()
BASE = os.path.dirname(os.path.abspath(__file__))
conn = sqlite3.connect(os.path.join(BASE, "banco.db"))
cur  = conn.cursor()

cur.execute("SELECT id, nome, email, senha FROM usuarios")
usuarios = cur.fetchall()

print(f"Encontrados {len(usuarios)} usuário(s).\n")

for uid, nome, email, senha_atual in usuarios:
    # Se já é argon2, pula
    if senha_atual.startswith("$argon2"):
        print(f"✓ [{email}] já usa argon2, pulando.")
        continue

    print(f"Usuário: {nome} ({email})")
    nova_senha = input("  Nova senha (deixe em branco para manter o email como senha): ").strip()
    if not nova_senha:
        nova_senha = email  # fallback

    novo_hash = ph.hash(nova_senha)
    cur.execute("UPDATE usuarios SET senha = ? WHERE id = ?", (novo_hash, uid))
    print(f"  ✓ Senha atualizada.\n")

conn.commit()
conn.close()
print("✅ Concluído!")