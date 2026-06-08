import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  :root {
    --accent: #00d4aa;
    --accent2: #0099ff;
    --accent3: #ff6b35;
    --accent4: #a855f7;
    --danger: #ff4757;
    --warn: #ffd32a;
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  /* TEMA ESCURO (padrão) */
  [data-theme="dark"], :root {
    --bg: #070809;
    --surface: #0e1013;
    --surface2: #13161a;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --text: #e8eaed;
    --text-dim: rgba(232,234,237,0.5);
    --text-muted: rgba(232,234,237,0.28);
    --track: rgba(255,255,255,0.08);
    color-scheme: dark;
  }

  /* TEMA CLARO */
  [data-theme="light"] {
    --bg: #f3f1f5;
    --surface: #ffffff;
    --surface2: #f8f6fa;
    --border: rgba(28,20,36,0.1);
    --border2: rgba(28,20,36,0.2);
    --text: #1b1722;
    --text-dim: rgba(27,23,34,0.62);
    --text-muted: rgba(27,23,34,0.42);
    --track: rgba(28,20,36,0.08);
    color-scheme: light;
  }

  .layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--bg);
    color: var(--text);
    overflow: hidden;
    position: fixed;
    inset: 0;
  }

  .layout-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    min-width: 0;
  }

  .layout-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .layout-content::-webkit-scrollbar { width: 4px; }
  .layout-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  .layout-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 99;
  }
  .layout-overlay.open { display: block; }
`;

// Mapeia rota → título da página
const PAGE_TITLES = {
  '/menu':         'Dashboard',
  '/produtos':     'Produtos',
  '/estoque':      'Estoque',
  '/entradas':     'Entradas',
  '/saidas':       'Saídas',
  '/pedidos':      'Pedidos',
  '/relatorios':   'Relatórios',
  '/lucros':       'Lucros',
  '/clientes':     'Clientes',
  '/fornecedores': 'Fornecedores',
  '/vendas':       'Vendas',
  '/configuracoes':'Configurações',
  '/usuarios':     'Usuários',
  '/parceiras':    'Parceiras',
};

const THEME_KEY = 'cf-theme';
const getStoredPref = () => { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; } };
const systemTheme = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
const resolveTheme = (pref) => pref === 'system' ? systemTheme() : pref;

// Ação principal do topbar por rota → label + destino
const PAGE_ACTIONS = {
  '/menu':         { label: 'Nova venda',      to: '/vendas' },
  '/produtos':     { label: 'Novo produto',    to: '/produtos?novo=1' },
  '/estoque':      { label: 'Nova entrada',    to: '/entradas?novo=1' },
  '/entradas':     { label: 'Nova entrada',    to: '/entradas?novo=1' },
  '/saidas':       { label: 'Nova saída',      to: '/saidas?novo=1' },
  '/vendas':       { label: 'Nova venda',      to: '/vendas?novo=1' },
  '/clientes':     { label: 'Novo cliente',    to: '/clientes?novo=1' },
  '/parceiras':    { label: 'Nova parceira',   to: '/parceiras?novo=1' },
  '/fornecedores': { label: 'Novo fornecedor', to: '/fornecedores?novo=1' },
  '/usuarios':     { label: 'Novo usuário',    to: '/usuarios?novo=1' },
};

export default function Layout() {
  const [sideOpen, setSideOpen] = useState(false);
  const [themePref, setThemePref] = useState(getStoredPref);
  const location = useLocation();
  const navigate = useNavigate();

  const title = PAGE_TITLES[location.pathname] || 'Cosmo Flux';
  const action = PAGE_ACTIONS[location.pathname] || null;

  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-theme', resolveTheme(themePref));
    apply();
    try { localStorage.setItem(THEME_KEY, themePref); } catch {}
    if (themePref === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [themePref]);

  const setTheme = (pref) => setThemePref(pref);

  return (
    <>
      <style>{styles}</style>

      <div
        className={`layout-overlay${sideOpen ? ' open' : ''}`}
        onClick={() => setSideOpen(false)}
      />

      <div className="layout">
        <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />

        <div className="layout-main">
          <Topbar
            title={title}
            actionLabel={action?.label}
            onAction={action ? () => navigate(action.to) : null}
            themePref={themePref}
            resolvedTheme={resolveTheme(themePref)}
            onSetTheme={setTheme}
            onMenuToggle={() => setSideOpen(o => !o)}
          />
          <div className="layout-content">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}