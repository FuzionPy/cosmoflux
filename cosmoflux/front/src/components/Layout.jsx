import { useState } from 'react';
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
    --bg: #070809;
    --surface: #0e1013;
    --surface2: #13161a;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --text: #e8eaed;
    --text-dim: rgba(232,234,237,0.5);
    --text-muted: rgba(232,234,237,0.28);
    --accent: #00d4aa;
    --accent2: #0099ff;
    --accent3: #ff6b35;
    --accent4: #a855f7;
    --danger: #ff4757;
    --warn: #ffd32a;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
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
  z-index: 1;
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
};

export default function Layout() {
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const title = PAGE_TITLES[location.pathname] || 'Cosmo Flux';

  return (
    <>
      <style>{styles}</style>

   

      <div className="layout">
        <Sidebar open={sideOpen} />

        <div
        className={`layout-overlay${sideOpen ? ' open' : ''}`}
        onClick={() => setSideOpen(false)}
      />

        <div className="layout-main">
          <Topbar
            title={title}
            onMenuToggle={() => setSideOpen(o => !o)}
            onNewProduct={() => navigate('/produtos')}
          />
          <div className="layout-content">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
