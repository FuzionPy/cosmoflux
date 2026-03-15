// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { logout } from '../services/authService';
// import {
//   getKPIs, getVendasPorMes, getProdutos,
//   getAlertasEstoque, getMovimentacoes, getPedidos
// } from '../services/api';

// const styles = `
//   @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

//   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

//   html, body, #root {
//     height: 100%;
//     width: 100%;
//     overflow: hidden;
//   }

//   :root {
//     --bg: #070809;
//     --surface: #0e1013;
//     --surface2: #13161a;
//     --border: rgba(255,255,255,0.06);
//     --border2: rgba(255,255,255,0.12);
//     --text: #e8eaed;
//     --text-dim: rgba(232,234,237,0.5);
//     --text-muted: rgba(232,234,237,0.28);
//     --accent: #00d4aa;
//     --accent2: #0099ff;
//     --accent3: #ff6b35;
//     --accent4: #a855f7;
//     --danger: #ff4757;
//     --warn: #ffd32a;
//     --font: 'Syne', sans-serif;
//     --mono: 'JetBrains Mono', monospace;
//     --sidebar-w: 220px;
//     --topbar-h: 60px;
//   }

//   .dash {
//     display: flex;
//     height: 100vh;
//     width: 100vw;
//     background: var(--bg);
//     color: var(--text);
//     font-family: var(--font);
//     overflow: hidden;
//     position: fixed;
//     inset: 0;
//   }

//   /* SIDEBAR */
//   .sidebar {
//     width: var(--sidebar-w);
//     flex-shrink: 0;
//     background: var(--surface);
//     border-right: 1px solid var(--border);
//     display: flex;
//     flex-direction: column;
//     height: 100vh;
//     overflow: hidden;
//     transition: transform 0.3s ease;
//     z-index: 100;
//   }

//   .sidebar-logo {
//     padding: 20px 18px;
//     border-bottom: 1px solid var(--border);
//     display: flex; align-items: center; gap: 10px; flex-shrink: 0;
//   }
//   .logo-icon {
//     width: 30px; height: 30px; border-radius: 7px;
//     background: linear-gradient(135deg, #00d4aa, #0099ff);
//     display: flex; align-items: center; justify-content: center;
//     font-size: 12px; font-weight: 800; color: #000; flex-shrink: 0;
//   }
//   .logo-text {
//     font-size: 12px; font-weight: 700; letter-spacing: 0.15em;
//     text-transform: uppercase; color: var(--text); white-space: nowrap;
//   }

//   .nav { flex: 1; padding: 12px 8px; overflow-y: auto; overflow-x: hidden; }
//   .nav::-webkit-scrollbar { width: 3px; }
//   .nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

//   .nav-section {
//     font-size: 9px; font-weight: 600; letter-spacing: 0.15em;
//     text-transform: uppercase; color: var(--text-muted);
//     padding: 14px 10px 5px; font-family: var(--mono); white-space: nowrap;
//   }
//   .nav-item {
//     display: flex; align-items: center; gap: 9px;
//     padding: 9px 10px; border-radius: 7px; cursor: pointer;
//     font-size: 13px; font-weight: 500; color: var(--text-dim);
//     transition: all 0.15s; border: 1px solid transparent;
//     user-select: none; white-space: nowrap;
//   }
//   .nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
//   .nav-item.active {
//     background: rgba(0,212,170,0.08);
//     border-color: rgba(0,212,170,0.18);
//     color: var(--accent);
//   }
//   .nav-icon { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
//   .nav-badge {
//     margin-left: auto; font-size: 10px; font-family: var(--mono);
//     background: rgba(0,212,170,0.15); color: var(--accent);
//     padding: 1px 6px; border-radius: 4px;
//   }

//   .sidebar-footer { padding: 12px 8px; border-top: 1px solid var(--border); flex-shrink: 0; }
//   .user-card {
//     display: flex; align-items: center; gap: 9px;
//     padding: 9px 10px; border-radius: 7px; cursor: pointer; transition: background 0.15s;
//   }
//   .user-card:hover { background: rgba(255,255,255,0.04); }
//   .user-avatar {
//     width: 30px; height: 30px; border-radius: 50%;
//     background: linear-gradient(135deg, var(--accent4), var(--accent2));
//     display: flex; align-items: center; justify-content: center;
//     font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
//   }
//   .user-info { flex: 1; min-width: 0; }
//   .user-name { font-size: 12px; font-weight: 600; color: var(--text); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
//   .user-role { font-size: 10px; color: var(--text-muted); font-family: var(--mono); }
//   .logout-btn {
//     background: none; border: none; cursor: pointer;
//     color: var(--text-muted); transition: color 0.15s; padding: 4px; flex-shrink: 0;
//   }
//   .logout-btn:hover { color: var(--danger); }

//   /* MAIN */
//   .main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }

//   .topbar {
//     height: var(--topbar-h);
//     border-bottom: 1px solid var(--border);
//     display: flex; align-items: center;
//     padding: 0 24px; gap: 12px;
//     background: var(--surface); flex-shrink: 0;
//   }
//   .menu-toggle {
//     display: none; background: none; border: none;
//     color: var(--text-dim); cursor: pointer; padding: 6px;
//     border-radius: 6px; transition: background 0.15s; align-items: center;
//   }
//   .menu-toggle:hover { background: rgba(255,255,255,0.06); }
//   .topbar-info { flex: 1; min-width: 0; }
//   .topbar-title { font-size: 16px; font-weight: 700; color: var(--text); }
//   .topbar-sub { font-size: 11px; color: var(--text-muted); font-family: var(--mono); margin-top: 1px; }

//   .search-wrap {
//     display: flex; align-items: center; gap: 7px;
//     background: var(--surface2); border: 1px solid var(--border);
//     border-radius: 7px; padding: 7px 12px; transition: border-color 0.2s;
//   }
//   .search-wrap:focus-within { border-color: var(--border2); }
//   .search-wrap input {
//     background: none; border: none; outline: none;
//     font-size: 13px; color: var(--text); font-family: var(--font); width: 180px;
//   }
//   .search-wrap input::placeholder { color: var(--text-muted); }

//   .btn {
//     display: flex; align-items: center; gap: 5px;
//     padding: 7px 14px; border-radius: 7px; border: none;
//     font-family: var(--font); font-size: 12px; font-weight: 600;
//     cursor: pointer; transition: all 0.15s; white-space: nowrap;
//   }
//   .btn-primary { background: var(--accent); color: #000; }
//   .btn-primary:hover { background: #00efc0; transform: translateY(-1px); }
//   .btn-ghost {
//     background: rgba(255,255,255,0.05); color: var(--text-dim);
//     border: 1px solid var(--border);
//   }
//   .btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--text); }

//   /* CONTENT */
//   .content {
//     flex: 1; overflow-y: auto; overflow-x: hidden;
//     padding: 24px; display: flex; flex-direction: column; gap: 20px;
//   }
//   .content::-webkit-scrollbar { width: 4px; }
//   .content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

//   /* KPIs */
//   .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
//   .kpi {
//     background: var(--surface); border: 1px solid var(--border);
//     border-radius: 11px; padding: 18px; position: relative;
//     overflow: hidden; transition: border-color 0.2s, transform 0.2s;
//     animation: up 0.4s cubic-bezier(.22,1,.36,1) both;
//   }
//   .kpi:hover { border-color: var(--border2); transform: translateY(-2px); }
//   .kpi::before {
//     content: ''; position: absolute; top: 0; left: 0; right: 0;
//     height: 2px; background: var(--c, var(--accent));
//   }
//   .kpi-label {
//     font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
//     text-transform: uppercase; color: var(--text-muted);
//     font-family: var(--mono); margin-bottom: 8px;
//   }
//   .kpi-value { font-size: 22px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 7px; font-family: var(--mono); }
//   .kpi-delta { font-size: 11px; font-family: var(--mono); display: flex; align-items: center; gap: 3px; }
//   .kpi-delta.down { color: var(--danger); }
//   .kpi-icon {
//     position: absolute; top: 16px; right: 16px;
//     width: 32px; height: 32px; border-radius: 7px;
//     display: flex; align-items: center; justify-content: center;
//     background: rgba(255,255,255,0.04); font-size: 14px;
//   }

//   /* GRID */
//   .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
//   .grid3 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }

//   /* CARD */
//   .card {
//     background: var(--surface); border: 1px solid var(--border);
//     border-radius: 11px; overflow: hidden;
//     animation: up 0.5s cubic-bezier(.22,1,.36,1) both;
//   }
//   .card-header {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 16px 18px; border-bottom: 1px solid var(--border);
//   }
//   .card-title { font-size: 13px; font-weight: 700; color: var(--text); }
//   .card-sub { font-size: 10px; color: var(--text-muted); font-family: var(--mono); margin-top: 2px; }

//   /* TABLE */
//   .tbl { width: 100%; border-collapse: collapse; }
//   .tbl th {
//     text-align: left; padding: 9px 18px;
//     font-size: 9px; font-weight: 600; letter-spacing: 0.12em;
//     text-transform: uppercase; color: var(--text-muted);
//     font-family: var(--mono); border-bottom: 1px solid var(--border);
//   }
//   .tbl td {
//     padding: 11px 18px; font-size: 12px; color: var(--text-dim);
//     border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.15s;
//   }
//   .tbl tr:last-child td { border-bottom: none; }
//   .tbl tr:hover td { background: rgba(255,255,255,0.02); color: var(--text); }
//   .tbl td:first-child { color: var(--text); font-weight: 500; }

//   /* BADGE */
//   .badge {
//     display: inline-flex; align-items: center;
//     padding: 2px 7px; border-radius: 4px;
//     font-size: 10px; font-weight: 600; font-family: var(--mono);
//   }
//   .b-green  { background: rgba(0,212,170,0.12);  color: var(--accent); }
//   .b-red    { background: rgba(255,71,87,0.12);   color: var(--danger); }
//   .b-blue   { background: rgba(0,153,255,0.12);   color: var(--accent2); }
//   .b-orange { background: rgba(255,107,53,0.12);  color: var(--accent3); }
//   .b-yellow { background: rgba(255,211,42,0.12);  color: var(--warn); }

//   /* BARS */
//   .bars { display: flex; align-items: flex-end; gap: 5px; height: 90px; padding: 16px 18px 10px; }
//   .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
//   .bar {
//     width: 100%; border-radius: 3px 3px 0 0;
//     background: rgba(255,255,255,0.07);
//     transition: height 0.6s cubic-bezier(.22,1,.36,1), background 0.2s;
//     min-height: 3px;
//   }
//   .bar:hover { background: var(--accent) !important; }
//   .bar-lbl { font-size: 9px; color: var(--text-muted); font-family: var(--mono); }

//   /* ALERT */
//   .alert-item {
//     display: flex; align-items: center; gap: 10px;
//     padding: 11px 18px; border-bottom: 1px solid rgba(255,255,255,0.03);
//     transition: background 0.15s;
//   }
//   .alert-item:last-child { border-bottom: none; }
//   .alert-item:hover { background: rgba(255,255,255,0.02); }
//   .alert-name { flex: 1; font-size: 12px; color: var(--text); font-weight: 500; }
//   .alert-stock { font-size: 11px; font-family: var(--mono); color: var(--text-muted); }

//   /* ACTIVITY */
//   .activity-item {
//     display: flex; align-items: flex-start; gap: 10px;
//     padding: 10px 18px; transition: background 0.15s;
//     border-bottom: 1px solid rgba(255,255,255,0.03);
//   }
//   .activity-item:last-child { border-bottom: none; }
//   .activity-item:hover { background: rgba(255,255,255,0.02); }
//   .act-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
//   .act-text { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
//   .act-text strong { color: var(--text); font-weight: 600; }
//   .act-meta { display: flex; gap: 8px; margin-top: 3px; align-items: center; flex-wrap: wrap; }
//   .act-meta span { font-size: 10px; font-family: var(--mono); color: var(--text-muted); }

//   /* SKELETON */
//   .skeleton {
//     background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
//     background-size: 200% 100%;
//     animation: shimmer 1.5s infinite;
//     border-radius: 6px;
//   }
//   @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
//   .empty { padding: 28px; text-align: center; color: var(--text-muted); font-size: 12px; font-family: var(--mono); }

//   /* OVERLAY */
//   .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99; }

//   @keyframes up {
//     from { opacity: 0; transform: translateY(12px); }
//     to   { opacity: 1; transform: translateY(0); }
//   }

//   /* RESPONSIVE */
//   @media (max-width: 1200px) {
//     .kpis { grid-template-columns: repeat(2, 1fr); }
//   }
//   @media (max-width: 900px) {
//     .grid2, .grid3 { grid-template-columns: 1fr; }
//     .search-wrap { display: none; }
//   }
//   @media (max-width: 768px) {
//     .sidebar {
//       position: fixed; left: 0; top: 0; bottom: 0;
//       transform: translateX(-100%);
//     }
//     .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
//     .overlay.open { display: block; }
//     .menu-toggle { display: flex !important; }
//     .content { padding: 16px; gap: 14px; }
//     .topbar { padding: 0 16px; }
//     .kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
//   }
//   @media (max-width: 480px) {
//     .kpis { grid-template-columns: 1fr; }
//     .btn-label { display: none; }
//   }
// `;

// const NAV_ITEMS = [
//   { id: 'dashboard',    label: 'Dashboard',    icon: '⬡', section: 'VISÃO GERAL' },
//   { id: 'produtos',     label: 'Produtos',     icon: '◈', section: null },
//   { id: 'estoque',      label: 'Estoque',      icon: '◫', section: null },
//   { id: 'entradas',     label: 'Entradas',     icon: '↑', section: 'MOVIMENTAÇÕES' },
//   { id: 'saidas',       label: 'Saídas',       icon: '↓', section: null },
//   { id: 'pedidos',      label: 'Pedidos',      icon: '◻', section: null },
//   { id: 'relatorios',   label: 'Relatórios',   icon: '▦', section: 'ANÁLISE' },
//   { id: 'clientes',     label: 'Clientes',     icon: '◯', section: 'CADASTROS' },
//   { id: 'fornecedores', label: 'Fornecedores', icon: '◎', section: null },
// ];

// const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
// const fmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// const StatusBadge = ({ s }) => {
//   const map = {
//     ok:         <span className="badge b-green">OK</span>,
//     critico:    <span className="badge b-orange">BAIXO</span>,
//     esgotado:   <span className="badge b-red">ESGOTADO</span>,
//     pendente:   <span className="badge b-yellow">PENDENTE</span>,
//     confirmado: <span className="badge b-blue">CONFIRMADO</span>,
//     entregue:   <span className="badge b-green">ENTREGUE</span>,
//     cancelado:  <span className="badge b-red">CANCELADO</span>,
//   };
//   return map[s] || <span className="badge b-blue">{s}</span>;
// };

// export default function Menu() {
//   const [active,      setActive]  = useState('dashboard');
//   const [sideOpen,    setSide]    = useState(false);
//   const navigate                  = useNavigate();

//   const [kpis,     setKpis]     = useState(null);
//   const [vendas,   setVendas]   = useState([]);
//   const [produtos, setProdutos] = useState([]);
//   const [alertas,  setAlertas]  = useState([]);
//   const [movs,     setMovs]     = useState([]);
//   const [pedidos,  setPedidos]  = useState([]);
//   const [loading,  setLoading]  = useState(true);
//   const [error,    setError]    = useState('');

//   useEffect(() => {
//     (async () => {
//       setLoading(true); setError('');
//       try {
//         const [k, v, p, a, m, ped] = await Promise.allSettled([
//           getKPIs(), getVendasPorMes(), getProdutos(),
//           getAlertasEstoque(), getMovimentacoes(), getPedidos()
//         ]);
//         if (k.status   === 'fulfilled') setKpis(k.value);
//         if (v.status   === 'fulfilled') setVendas(v.value);
//         if (p.status   === 'fulfilled') setProdutos(p.value);
//         if (a.status   === 'fulfilled') setAlertas(a.value);
//         if (m.status   === 'fulfilled') setMovs(m.value);
//         if (ped.status === 'fulfilled') setPedidos(ped.value);
//       } catch {
//         setError('Erro ao carregar dados. Verifique se o backend está rodando.');
//       } finally { setLoading(false); }
//     })();
//   }, []);

//   const handleLogout = () => { logout(); navigate('/'); };
//   const navTo = (id) => { setActive(id); setSide(false); };

//   const userName = (() => {
//     try {
//       const t = localStorage.getItem('token') || sessionStorage.getItem('token');
//       if (t) { const p = JSON.parse(atob(t.split('.')[1])); return p.nome || 'Usuário'; }
//     } catch {}
//     return 'Usuário';
//   })();

//   const pageLabel = NAV_ITEMS.find(n => n.id === active)?.label || 'Dashboard';
//   const maxVenda  = Math.max(...vendas.map(v => v.total), 1);
//   const pendentes = pedidos.filter(p => p.status === 'pendente').length;

//   const SkeletonRows = ({ n = 4 }) => (
//     <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
//       {Array.from({ length: n }).map((_, i) => (
//         <div key={i} className="skeleton" style={{ height: 36, animationDelay: `${i * 0.1}s` }} />
//       ))}
//     </div>
//   );

//   return (
//     <>
//       <style>{styles}</style>

//       <div className={`overlay${sideOpen ? ' open' : ''}`} onClick={() => setSide(false)} />

//       <div className="dash">

//         {/* SIDEBAR */}
//         <aside className={`sidebar${sideOpen ? ' open' : ''}`}>
//           <div className="sidebar-logo">
//             <div className="logo-icon">CF</div>
//             <span className="logo-text">Cosmo Flux</span>
//           </div>

//           <nav className="nav">
//             {NAV_ITEMS.map(item => (
//               <div key={item.id}>
//                 {item.section && <div className="nav-section">{item.section}</div>}
//                 <div className={`nav-item${active === item.id ? ' active' : ''}`} onClick={() => navTo(item.id)}>
//                   <span className="nav-icon">{item.icon}</span>
//                   {item.label}
//                   {item.id === 'pedidos'  && pendentes > 0  && <span className="nav-badge">{pendentes}</span>}
//                   {item.id === 'estoque'  && alertas.length > 0 && (
//                     <span className="nav-badge" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--danger)' }}>{alertas.length}</span>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </nav>

//           <div className="sidebar-footer">
//             <div className="user-card">
//               <div className="user-avatar">{userName[0]?.toUpperCase()}</div>
//               <div className="user-info">
//                 <div className="user-name">{userName}</div>
//                 <div className="user-role">admin</div>
//               </div>
//               <button className="logout-btn" onClick={handleLogout} title="Sair">
//                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
//                   <polyline points="16 17 21 12 16 7"/>
//                   <line x1="21" y1="12" x2="9" y2="12"/>
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </aside>

//         {/* MAIN */}
//         <main className="main">
//           <header className="topbar">
//             <button className="menu-toggle" onClick={() => setSide(o => !o)}>
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <line x1="3" y1="6" x2="21" y2="6"/>
//                 <line x1="3" y1="12" x2="21" y2="12"/>
//                 <line x1="3" y1="18" x2="21" y2="18"/>
//               </svg>
//             </button>
//             <div className="topbar-info">
//               <div className="topbar-title">{pageLabel}</div>
//               <div className="topbar-sub">
//                 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
//               </div>
//             </div>
//             <div className="search-wrap">
//               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
//                 <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
//               </svg>
//               <input placeholder="Buscar..." />
//             </div>
//             <button className="btn btn-primary" onClick={() => navTo('produtos')}>
//               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                 <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
//               </svg>
//               <span className="btn-label">Novo Produto</span>
//             </button>
//           </header>

//           <div className="content">

//             {error && (
//               <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>
//                 ⚠ {error}
//               </div>
//             )}

//             {/* KPIs */}
//             <div className="kpis">
//               {[
//                 { label: 'Receita do Mês',  value: fmtBRL(kpis?.receita_mes),  icon: '₿', color: 'var(--accent)',  delay: '0s' },
//                 { label: 'Pedidos Hoje',    value: String(kpis?.pedidos_hoje ?? '—'), icon: '◻', color: 'var(--accent2)', delay: '0.06s' },
//                 { label: 'Produtos Ativos', value: String(kpis?.total_produtos ?? '—'), icon: '◈', color: 'var(--accent3)', delay: '0.12s' },
//                 { label: 'Lucro do Mês',    value: fmtBRL(kpis?.lucro_mes),    icon: '◎', color: 'var(--accent4)', delay: '0.18s' },
//               ].map(k => (
//                 <div key={k.label} className="kpi" style={{ '--c': k.color, animationDelay: k.delay }}>
//                   <div className="kpi-icon">{k.icon}</div>
//                   <div className="kpi-label">{k.label}</div>
//                   <div className="kpi-value">
//                     {loading ? <div className="skeleton" style={{ height: 20, width: 90 }} /> : k.value}
//                   </div>
//                   {!loading && kpis?.estoque_critico > 0 && k.label === 'Produtos Ativos' && (
//                     <div className="kpi-delta down">▼ {kpis.estoque_critico} críticos</div>
//                   )}
//                 </div>
//               ))}
//             </div>

//             {/* GRÁFICO + ALERTAS */}
//             <div className="grid3">
//               <div className="card">
//                 <div className="card-header">
//                   <div>
//                     <div className="card-title">Pedidos por Mês</div>
//                     <div className="card-sub">{new Date().getFullYear()}</div>
//                   </div>
//                 </div>
//                 {loading ? <SkeletonRows n={1} /> : (
//                   <>
//                     <div className="bars">
//                       {vendas.map((v, i) => (
//                         <div key={i} className="bar-col">
//                           <div className="bar" style={{
//                             height: `${(v.total / maxVenda) * 100}%`,
//                             background: i === new Date().getMonth() ? 'rgba(0,212,170,0.45)' : undefined,
//                           }} />
//                           <div className="bar-lbl">{MESES[i]}</div>
//                         </div>
//                       ))}
//                     </div>
//                     <div style={{ padding: '0 18px 14px', display: 'flex', gap: 24 }}>
//                       <div>
//                         <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>TOTAL ANO</div>
//                         <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
//                           {vendas.reduce((a, v) => a + v.total, 0)}
//                         </div>
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </div>

//               <div className="card">
//                 <div className="card-header">
//                   <div>
//                     <div className="card-title">Alerta de Estoque</div>
//                     <div className="card-sub">{alertas.length} crítico(s)</div>
//                   </div>
//                 </div>
//                 {loading ? <SkeletonRows n={3} /> : alertas.length === 0 ? (
//                   <div className="empty">✓ Estoque em ordem</div>
//                 ) : alertas.map((a, i) => (
//                   <div key={i} className="alert-item">
//                     <span className={`badge ${a.status === 'esgotado' ? 'b-red' : 'b-orange'}`}>
//                       {a.status === 'esgotado' ? 'ESGOTADO' : 'BAIXO'}
//                     </span>
//                     <span className="alert-name">{a.nome}</span>
//                     <span className="alert-stock">{a.estoque_atual}/{a.estoque_minimo}</span>
//                   </div>
//                 ))}
//                 <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
//                   <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => navTo('estoque')}>
//                     Ver Estoque
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* PRODUTOS + LATERAL */}
//             <div className="grid2">
//               <div className="card">
//                 <div className="card-header">
//                   <div>
//                     <div className="card-title">Produtos</div>
//                     <div className="card-sub">{produtos.length} cadastrados</div>
//                   </div>
//                   <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => navTo('produtos')}>
//                     Ver todos
//                   </button>
//                 </div>
//                 {loading ? <SkeletonRows n={5} /> : produtos.length === 0 ? (
//                   <div className="empty">Nenhum produto cadastrado</div>
//                 ) : (
//                   <table className="tbl">
//                     <thead>
//                       <tr><th>Produto</th><th>Estoque</th><th>Preço</th><th>Status</th></tr>
//                     </thead>
//                     <tbody>
//                       {produtos.slice(0, 6).map((p, i) => (
//                         <tr key={i}>
//                           <td>
//                             <div>{p.nome}</div>
//                             {p.categoria && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{p.categoria}</div>}
//                           </td>
//                           <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.estoque_atual} {p.unidade}</td>
//                           <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtBRL(p.preco_venda)}</td>
//                           <td><StatusBadge s={p.status} /></td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//               </div>

//               <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
//                 {/* Pedidos */}
//                 <div className="card">
//                   <div className="card-header">
//                     <div className="card-title">Pedidos Recentes</div>
//                     <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => navTo('pedidos')}>
//                       Ver mais
//                     </button>
//                   </div>
//                   {loading ? <SkeletonRows n={3} /> : pedidos.length === 0 ? (
//                     <div className="empty">Nenhum pedido</div>
//                   ) : pedidos.slice(0, 4).map((p, i) => (
//                     <div key={i} className="activity-item">
//                       <div className="act-dot" style={{
//                         background: p.status === 'entregue' ? 'var(--accent)' : p.status === 'cancelado' ? 'var(--danger)' : 'var(--accent2)'
//                       }} />
//                       <div>
//                         <div className="act-text"><strong>#{p.id}</strong> — {p.cliente}</div>
//                         <div className="act-meta">
//                           <StatusBadge s={p.status} />
//                           <span style={{ color: 'var(--accent)' }}>{fmtBRL(p.total)}</span>
//                           <span>{p.data}</span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Movimentações */}
//                 <div className="card">
//                   <div className="card-header">
//                     <div className="card-title">Movimentações</div>
//                     <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => navTo('entradas')}>
//                       Ver mais
//                     </button>
//                   </div>
//                   {loading ? <SkeletonRows n={3} /> : movs.length === 0 ? (
//                     <div className="empty">Sem movimentações</div>
//                   ) : movs.slice(0, 5).map((m, i) => (
//                     <div key={i} className="activity-item">
//                       <div className="act-dot" style={{ background: m.tipo === 'entrada' ? 'var(--accent)' : 'var(--accent3)' }} />
//                       <div>
//                         <div className="act-text"><strong>{m.tipo.toUpperCase()}</strong> — {m.produto}</div>
//                         <div className="act-meta">
//                           <span style={{ color: m.tipo === 'entrada' ? 'var(--accent)' : 'var(--accent3)' }}>
//                             {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un
//                           </span>
//                           {m.motivo && <span>{m.motivo}</span>}
//                           <span>{m.data}</span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>

//           </div>
//         </main>
//       </div>
//     </>
//   );
// }