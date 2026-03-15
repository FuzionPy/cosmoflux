"""
Substitui a linha BASE fixa pelo import.meta.env em todos os .jsx
de pages/ e components/ automaticamente.

Execute na pasta front/src/:
  python fix_base_url.py "C:/caminho/para/front/src"
"""
import os, sys

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

ANTIGO = "const BASE = 'http://127.0.0.1:8000/api';"
NOVO   = "const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';"

# Também cobre variações sem /api no final
ANTIGO2 = "const BASE = 'http://127.0.0.1:8000';"
NOVO2   = "const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';"

pastas = ['pages', 'components']
substituidos = 0

for pasta in pastas:
    dirpath = os.path.join(SRC_DIR, pasta)
    if not os.path.isdir(dirpath):
        print(f"  ⚠ Pasta não encontrada: {dirpath}")
        continue
    print(f"\n📁 {pasta}/")
    for nome in sorted(os.listdir(dirpath)):
        if not nome.endswith('.jsx'): continue
        path = os.path.join(dirpath, nome)
        with open(path, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        novo = conteudo.replace(ANTIGO, NOVO).replace(ANTIGO2, NOVO2)
        if novo != conteudo:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(novo)
            print(f"  ✓ {nome}")
            substituidos += 1
        else:
            print(f"  ~ {nome} — sem alteração")

print(f"\n✅ {substituidos} arquivo(s) atualizado(s)")
print("   Reinicie o Vite: npm run dev")