from models import Usuario, get_db
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

migrados = 0
for u in db.query(Usuario).all():
    if not u.senha.startswith("$2b$"):  # ainda não é bcrypt
        u.senha = pwd.hash(u.senha)
        migrados += 1

db.commit()
print(f"Senhas migradas: {migrados}")