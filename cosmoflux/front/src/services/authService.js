const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const login = async (email, password, rememberMe) => {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password, rememberMe }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || 'Erro ao fazer login');

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('token',     data.token);
  storage.setItem('nome',      data.nome);
  storage.setItem('email',     data.email);
  storage.setItem('admin',     String(data.admin));
  storage.setItem('tenant_id', String(data.tenant_id ?? ''));

  // busca avatar do perfil
  try {
    const perfilRes = await fetch(`${API}/auth/perfil`, {
      headers: { Authorization: `Bearer ${data.token}` }
    });
    if (perfilRes.ok) {
      const perfil = await perfilRes.json();
      if (perfil.avatar) storage.setItem('avatar', perfil.avatar);
    }
  } catch {}

  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('nome');
  localStorage.removeItem('email');
  localStorage.removeItem('admin');
  localStorage.removeItem('tenant_id');
  localStorage.removeItem('avatar');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('nome');
  sessionStorage.removeItem('email');
  sessionStorage.removeItem('admin');
  sessionStorage.removeItem('tenant_id');
  sessionStorage.removeItem('avatar');
};

export const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token');