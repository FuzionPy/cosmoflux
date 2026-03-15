// Login — retorna { token, user, ... } ou lança erro
export const login = async (email, password, rememberMe) => {
  const response = await fetch('http://127.0.0.1:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password, rememberMe }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao fazer login');
  }

  // Salva token conforme "lembrar de mim"
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('token', data.token);

  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

export const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token');