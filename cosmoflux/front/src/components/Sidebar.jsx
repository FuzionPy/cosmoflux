import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';

const isAdmin = () =>
  localStorage.getItem('admin') === 'true' ||
  sessionStorage.getItem('admin') === 'true';

const getNome = () => {
  try {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (t) { const p = JSON.parse(atob(t.split('.')[1])); return p.nome || 'Usuário'; }
  } catch {}
  return localStorage.getItem('nome') || sessionStorage.getItem('nome') || 'Usuário';
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .sidebar {
    width: 220px; flex-shrink: 0;
    background: #0e1013;
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
    transition: transform 0.3s ease;
    z-index: 100; font-family: 'Syne', sans-serif;
  }
  .sidebar-logo {
    padding: 20px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .sb-logo-icon {
    width: 30px; height: 30px; border-radius: 7px;
    background: linear-gradient(135deg, #000, #b300ff);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .sb-logo-text {
    font-size: 12px; font-weight: 700; letter-spacing: 0.15em;
    text-transform: uppercase; color: #e8eaed; white-space: nowrap;
  }

  .sb-nav { flex: 1; padding: 12px 8px; overflow-y: auto; overflow-x: hidden; }
  .sb-nav::-webkit-scrollbar { width: 3px; }
  .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  .sb-section {
    font-size: 9px; font-weight: 600; letter-spacing: 0.15em;
    text-transform: uppercase; color: rgba(232,234,237,0.28);
    padding: 14px 10px 5px; font-family: 'JetBrains Mono', monospace; white-space: nowrap;
  }
  .sb-item {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 10px; border-radius: 7px; cursor: pointer;
    font-size: 13px; font-weight: 500; color: rgba(232,234,237,0.5);
    transition: all 0.15s; border: 1px solid transparent;
    user-select: none; white-space: nowrap; text-decoration: none;
  }
  .sb-item:hover { background: rgba(255,255,255,0.04); color: #e8eaed; }
  .sb-item.active {
    background: rgba(0,212,170,0.08);
    border-color: rgba(0,212,170,0.18);
    color: #00d4aa;
  }
  .sb-icon { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
  .sb-badge {
    margin-left: auto; font-size: 10px; font-family: 'JetBrains Mono', monospace;
    background: rgba(0,212,170,0.15); color: #00d4aa;
    padding: 1px 6px; border-radius: 4px;
  }
  .sb-badge.danger { background: rgba(255,71,87,0.15); color: #ff4757; }

  .sb-footer { padding: 12px 8px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
  .sb-user {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 10px; border-radius: 7px; cursor: default; transition: background 0.15s;
  }
  .sb-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #a855f7, #0099ff);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
  }
  .sb-avatar.admin-av { background: linear-gradient(135deg, #00d4aa, #0099ff); }
  .sb-user-info { flex: 1; min-width: 0; }
  .sb-user-name {
    font-size: 12px; font-weight: 600; color: #e8eaed;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .sb-user-role { font-size: 10px; color: rgba(232,234,237,0.28); font-family: 'JetBrains Mono', monospace; }
  .sb-user-role.admin-role { color: #a855f7; }
  .sb-logout {
    background: none; border: none; cursor: pointer;
    color: rgba(232,234,237,0.28); transition: color 0.15s; padding: 4px; flex-shrink: 0;
  }
  .sb-logout:hover { color: #ff4757; }

  @media (max-width: 768px) {
    .sidebar { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
  }
`;

const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/menu',         icon: '⬡', section: 'VISÃO GERAL' },
  { label: 'Vendas',       path: '/vendas',       icon: '◆', section: 'VENDAS' },
  { label: 'Clientes',     path: '/clientes',     icon: '◯', section: null },
  { label: 'Produtos',     path: '/produtos',     icon: '◈', section: 'ESTOQUE' },
  { label: 'Estoque',      path: '/estoque',      icon: '◫', section: null },
  { label: 'Entradas',     path: '/entradas',     icon: '↑', section: null },
  { label: 'Saídas',       path: '/saidas',       icon: '↓', section: null },
  { label: 'Pedidos',      path: '/pedidos',      icon: '◻', section: null },
  { label: 'Relatórios',   path: '/relatorios',   icon: '▦', section: 'ANÁLISE' },
  { label: 'Lucros',       path: '/lucros',       icon: '◈', section: null },
  { label: 'Fornecedores', path: '/fornecedores', icon: '◎', section: 'CADASTROS' },
];

const ADMIN_ITEMS = [
  { label: 'Usuários', path: '/usuarios', icon: '◉', section: 'ADMINISTRAÇÃO' },
];

export default function Sidebar({ open, badges = {} }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const admin     = isAdmin();
  const userName  = getNome();

  const allItems  = admin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      <style>{styles}</style>
      <aside className={`sidebar${open ? ' open' : ''}`}>

        <div className="sidebar-logo">
          <div className="sb-logo-icon">CF</div>
          <span className="sb-logo-text">Cosmo Flux</span>
        </div>

        <nav className="sb-nav">
          {allItems.map(item => (
            <div key={item.path}>
              {item.section && <div className="sb-section">{item.section}</div>}
              <div
                className={`sb-item${location.pathname === item.path ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="sb-icon">{item.icon}</span>
                {item.label}
                {badges[item.path] > 0 && (
                  <span className={`sb-badge${badges[item.path + '_danger'] ? ' danger' : ''}`}>
                    {badges[item.path]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className={`sb-avatar${admin ? ' admin-av' : ''}`}>
              {userName[0]?.toUpperCase()}
            </div>
            <div className="sb-user-info">
              <div className="sb-user-name">{userName}</div>
              <div className={`sb-user-role${admin ? ' admin-role' : ''}`}>
                {admin ? 'administrador' : 'usuário'}
              </div>
            </div>
            <button className="sb-logout" onClick={handleLogout} title="Sair">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}