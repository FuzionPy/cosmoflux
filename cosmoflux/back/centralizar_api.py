"""
Substitui o bloco duplicado de BASE/tok/h/api em todos os .jsx por:
  import { api } from '../services/api';

Execute na pasta front/src/pages/:
  python centralizar_api.py

Ou informe o caminho:
  python centralizar_api.py "C:/caminho/para/front/src/pages"
"""
import os, re, sys

PAGES_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "pages")

# Padrão que aparece em todas as páginas — captura variações
PATTERN = re.compile(
    r"const BASE\s*=\s*['\"]http://.*?['\"].*?\n"   # const BASE = ...
    r"const tok\s*=.*?\n"                            # const tok = ...
    r"const h\s*=.*?\n"                              # const h = ...
    r"const api\s*=\s*\{.*?\};\s*\n",               # const api = { ... };
    re.DOTALL
)

IMPORT_LINE = "import { api } from '../services/api';\n"

if not os.path.isdir(PAGES_DIR):
    print(f"❌ Pasta não encontrada: {PAGES_DIR}")
    print("   Informe o caminho correto como argumento.")
    sys.exit(1)

arquivos = [f for f in os.listdir(PAGES_DIR) if f.endswith('.jsx')]
print(f"📁 Pasta: {PAGES_DIR}")
print(f"📄 {len(arquivos)} arquivo(s) encontrado(s)\n")

substituidos = 0
for nome in arquivos:
    path = os.path.join(PAGES_DIR, nome)
    with open(path, 'r', encoding='utf-8') as f:
        conteudo = f.read()

    novo, n = PATTERN.subn(IMPORT_LINE, conteudo)

    if n > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(novo)
        print(f"  ✓ {nome} — {n} substituição(ões)")
        substituidos += 1
    else:
        print(f"  ~ {nome} — nada a substituir (já usa import ou padrão diferente)")

print(f"\n✅ Concluído! {substituidos} arquivo(s) atualizado(s)")
print("\n📋 Próximo passo:")
print("   Crie o arquivo front/src/services/api.js com o conteúdo do api.js gerado")