from models import Usuario, SessionLocal

db = SessionLocal()

usuario_teste = Usuario(
    nome="Admin Teste",
    email="teste@email.com",
    senha="123456",
    ativo=True,
    admin=True
)

db.add(usuario_teste)
db.commit()
db.close()

print("✅ Usuário criado com sucesso!")
print("📧 Email: teste@email.com")
print("🔑 Senha: 123456")