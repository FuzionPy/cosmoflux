import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* ── API ──────────────────────────────────────────────────────────────── */
// auth_router é registrado com prefix '/auth' (SEM '/api') no backend — mesmo padrão de Configurações
const AUTH_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = {
  get:  url    => fetch(AUTH_BASE+url,{headers:h()}).then(async r=>{const d=await r.json().catch(()=>([]));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  post: (u,b)  => fetch(AUTH_BASE+u,{method:'POST',headers:h(),body:JSON.stringify(b||{})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:  (u,b)  => fetch(AUTH_BASE+u,{method:'PUT',headers:h(),body:JSON.stringify(b||{})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:  url    => fetch(AUTH_BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };

/* ── helpers ──────────────────────────────────────────────────────────── */
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const avatarColor = (n) => { let hh = 0; for (let i = 0; i < (n || '').length; i++) hh = (hh * 31 + n.charCodeAt(i)) % 360; return `hsl(${hh}, 52%, 52%)`; };
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const FORM_EMPTY = { nome:'', email:'', senha:'', tenant_mode:'existente', tenant_id:'', tenant_nome:'', admin:false };

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>{d}</svg>
);
const ICONS = {
  users:  <><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5"/><path d="M21 20a6 6 0 0 0-4-5.6"/></>,
  shield: <><path d="M12 2 3 6v6c0 5 3.5 9.7 9 10 5.5-.3 9-5 9-10V6l-9-4Z"/><path d="m9 12 2 2 4-4"/></>,
  plus:   <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  x:      <><path d="M18 6L6 18M6 6l12 12"/></>,
  edit:   <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></>,
  trash:  <><path d="M3 6h18"/><path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
  eye:    <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19 19 0 0 1 4.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19 19 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>,
  check:  <path d="M20 6 9 17l-5-5"/>,
  power:  <><path d="M18.36 6.64a9 9 0 1 1-12.72 0"/><path d="M12 2v10"/></>,
  mail:   <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
  build:  <><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></>,
};

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-usr-root *,.cf-usr-root *::before,.cf-usr-root *::after{box-sizing:border-box;}
.cf-usr-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--kpi-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cfuIn .3s ease both;}
@keyframes cfuIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-usr-root[data-theme="dark"],.cf-usr-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-usr-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-usr-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-usr-portal{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.cf-usr-portal[data-theme="dark"],.cf-usr-portal:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-usr-portal[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-usr-portal{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-usr-portal *,.cf-usr-portal *::before,.cf-usr-portal *::after{box-sizing:border-box;}

.cf-usr{display:flex;flex-direction:column;gap:var(--gap);max-width:1200px;margin:0 auto;}

.cf-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 15px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cf-btn:hover:not(:disabled){border-color:var(--border-strong);}
.cf-btn:disabled{opacity:.5;cursor:not-allowed;}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover:not(:disabled){filter:brightness(1.08);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-btn.sm{padding:7px 12px;font-size:12px;}
.cf-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-pill.brand{background:var(--brand-soft);color:var(--brand);}
.cf-pill.muted{background:var(--surface-2);color:var(--text-muted);}
.cf-mclose{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-mclose:hover{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 35%,transparent);}

.cf-usr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-usr-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--kpi-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-usr-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-usr-kpi.t-brand{--tone:var(--brand);}
.cf-usr-kpi.t-ok{--tone:var(--ok);}
.cf-usr-kpi.t-warn{--tone:var(--warn);}
.cf-usr-kpi.t-info{--tone:#3b82f6;}
.cf-usr-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-usr-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-usr-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-usr-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-usr-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}

.cf-usr-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.cf-usr-srch{display:flex;align-items:center;gap:9px;flex:1;min-width:230px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.cf-usr-srch:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-usr-srch input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.cf-usr-srch input::placeholder{color:var(--text-muted);}
.cf-usr-srch .x{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:17px;}
.cf-usr-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-usr-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-ui);}
.cf-usr-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-usr-chip-n{font-family:var(--font-mono);font-size:10px;opacity:.7;}

.cf-usr-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;background:var(--av,var(--brand));flex-shrink:0;position:relative;}
.cf-usr-avatar.inactive{opacity:.4;}
.cf-usr-avatar-star{position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;background:var(--brand);border:2px solid var(--surface);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;}

.cf-usr-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-usr-thead,.cf-usr-row{display:grid;grid-template-columns:2fr 1.4fr 1fr 100px 100px 130px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-usr-thead{background:var(--surface-2);}
.cf-usr-th{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-usr-th.r{text-align:right;justify-self:end;}
.cf-usr-row:last-child{border-bottom:none;}
.cf-usr-row.inactive{opacity:.6;background:color-mix(in oklab,var(--text) 2%,transparent);}
.cf-usr-r-user{display:flex;align-items:center;gap:11px;min-width:0;}
.cf-usr-r-info{min-width:0;flex:1;}
.cf-usr-r-nm{font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-usr-r-me{font-size:9px;font-family:var(--font-mono);color:var(--brand);background:var(--brand-soft);padding:2px 6px;border-radius:5px;letter-spacing:.06em;text-transform:uppercase;}
.cf-usr-r-email{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-usr-r-tenant{font-size:12px;color:var(--text-dim);font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-usr-r-actions{display:flex;gap:5px;justify-content:flex-end;}
.cf-usr-ic-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.cf-usr-ic-btn:hover:not(:disabled){border-color:var(--border-strong);color:var(--text);}
.cf-usr-ic-btn:disabled{opacity:.35;cursor:not-allowed;}
.cf-usr-ic-btn.danger{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 25%,transparent);}
.cf-usr-ic-btn.warn{color:var(--warn);}
.cf-usr-ic-btn.ok{color:var(--ok);}
.cf-usr-empty{padding:60px 20px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px;}
.cf-usr-empty-ic{width:44px;height:44px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);}
@media(max-width:900px){.cf-usr-thead,.cf-usr-row{grid-template-columns:2fr 130px;}.cf-usr-th:nth-child(2),.cf-usr-th:nth-child(3),.cf-usr-th:nth-child(4),.cf-usr-th:nth-child(5),.cf-usr-row>:nth-child(2),.cf-usr-row>:nth-child(3),.cf-usr-row>:nth-child(4),.cf-usr-row>:nth-child(5){display:none;}}

/* modal */
.cf-usr-mback{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:210;display:flex;align-items:center;justify-content:center;padding:20px;animation:cfuFade .2s ease both;}
@keyframes cfuFade{from{opacity:0}to{opacity:1}}
.cf-usr-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-usr-mhd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cf-usr-mtitle{font-size:15px;font-weight:800;}
.cf-usr-msub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-usr-mbody{padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
.cf-usr-mfoot{padding:13px 22px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}
.cf-usr-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-usr-field{display:flex;flex-direction:column;gap:5px;}
.cf-usr-label{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-usr-input,.cf-usr-select{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 13px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .18s;}
.cf-usr-input:focus,.cf-usr-select:focus{border-color:var(--brand-line);}
.cf-usr-input.err{border-color:color-mix(in oklab,var(--crit) 45%,transparent);}
.cf-usr-input-wrap{position:relative;}
.cf-usr-input-wrap .cf-usr-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;}
.cf-usr-hint{font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);}
.cf-usr-tabs{display:flex;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:3px;gap:2px;}
.cf-usr-tabs button{flex:1;padding:8px;border-radius:7px;border:none;background:none;cursor:pointer;font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--text-muted);}
.cf-usr-tabs button.on{background:var(--brand-soft);color:var(--brand);}
.cf-usr-check-row{display:flex;align-items:center;gap:11px;padding:11px 13px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;user-select:none;}
.cf-usr-check-row:hover{border-color:var(--border-strong);}
.cf-usr-check-row.on{background:var(--brand-soft);border-color:var(--brand-line);}
.cf-usr-check-box{width:20px;height:20px;border-radius:6px;border:2px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:all .15s;}
.cf-usr-check-row.on .cf-usr-check-box{background:var(--brand);border-color:var(--brand);}
.cf-usr-check-info{flex:1;min-width:0;}
.cf-usr-check-t{font-size:13px;font-weight:700;}
.cf-usr-check-s{font-size:11px;color:var(--text-muted);margin-top:2px;}
.cf-usr-confirm{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:400px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-usr-confirm-t{font-size:15px;font-weight:800;}
.cf-usr-confirm-x{font-size:13px;color:var(--text-dim);line-height:1.5;}
.cf-usr-confirm-acts{display:flex;gap:9px;}
.cf-usr-confirm-acts .cf-btn{flex:1;}

.cf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:cfuFade .3s ease both;white-space:nowrap;}
.cf-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}

.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfuSh 1.5s infinite;border-radius:8px;}
@keyframes cfuSh{from{background-position:200% 0}to{background-position:-200% 0}}

.cf-usr-403{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:60px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
.cf-usr-403-ic{width:56px;height:56px;border-radius:50%;background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);display:flex;align-items:center;justify-content:center;}
.cf-usr-403-t{font-size:16px;font-weight:800;}
.cf-usr-403-s{font-size:13px;color:var(--text-dim);max-width:400px;line-height:1.5;}

@media(max-width:1100px){.cf-usr-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-usr-kpis{grid-template-columns:1fr;}}
`;

/* ── Portal ───────────────────────────────────────────────────────────── */
function Portal({children, theme}) {
  useEffect(()=>{ const p=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=p; }; },[]);
  return createPortal(<div className="cf-usr-portal" data-theme={theme}>{children}</div>, document.body);
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Usuarios() {
  const [theme, setTheme] = useState(getDocTheme);
  const [usuarios, setUsuarios] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [meuEmail, setMeuEmail] = useState('');

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [modal, setModal] = useState(null); // 'novo' | null
  const [form, setForm] = useState(FORM_EMPTY);
  const [showSenha, setShowSenha] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  // pega e-mail do usuário logado (do próprio token JWT ou do perfil)
  useEffect(() => {
    api.get('/auth/perfil').then(p => setMeuEmail(p.email || '')).catch(() => {});
  }, []);

  const showToast = (msg, tone = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setErro(''); setForbidden(false);
    try {
      const [u, t] = await Promise.all([
        api.get('/auth/usuarios'),
        api.get('/auth/tenants').catch(() => []),
      ]);
      setUsuarios(Array.isArray(u) ? u : []);
      setTenants(Array.isArray(t) ? t : []);
    } catch (e) {
      if (String(e.message).toLowerCase().includes('admin')) setForbidden(true);
      else setErro(e.message || 'Erro ao carregar usuários');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tenantsMap = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.nome])), [tenants]);

  const counts = useMemo(() => ({
    todos: usuarios.length,
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length,
    admins: usuarios.filter(u => u.admin).length,
  }), [usuarios]);

  const lista = useMemo(() => {
    let r = usuarios.filter(u => {
      if (filtro === 'ativos' && !u.ativo) return false;
      if (filtro === 'inativos' && u.ativo) return false;
      if (filtro === 'admins' && !u.admin) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(u.nome.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
    return r.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [usuarios, filtro, busca]);

  const openNovo = () => {
    setForm({ ...FORM_EMPTY, tenant_mode: tenants.length ? 'existente' : 'novo', tenant_id: tenants[0]?.id || '' });
    setFormErr(''); setShowSenha(false); setModal('novo');
  };

  const salvar = async () => {
    setFormErr('');
    if (!form.nome.trim()) { setFormErr('O nome é obrigatório.'); return; }
    if (!isEmail(form.email)) { setFormErr('E-mail inválido.'); return; }
    if (form.senha.length < 6) { setFormErr('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (form.tenant_mode === 'novo' && !form.tenant_nome.trim()) { setFormErr('Informe o nome do novo tenant.'); return; }
    if (form.tenant_mode === 'existente' && !form.tenant_id) { setFormErr('Selecione um tenant.'); return; }

    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(), email: form.email.trim(), senha: form.senha,
        admin: form.admin,
        ...(form.tenant_mode === 'novo'
          ? { tenant_nome: form.tenant_nome.trim() }
          : { tenant_id: Number(form.tenant_id) }),
      };
      await api.post('/auth/cadastro', payload);
      showToast('Usuário cadastrado');
      setModal(null);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Erro ao cadastrar usuário.');
    } finally { setSalvando(false); }
  };

  const toggleAtivo = async (u) => {
    try {
      await api.put(`/auth/usuarios/${u.id}`, { ativo: !u.ativo });
      showToast(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao atualizar usuário', 'err');
    }
  };

  const remover = async (u) => {
    try {
      await api.del(`/auth/usuarios/${u.id}`);
      setConfirmDel(null);
      showToast('Usuário removido', 'err');
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao remover usuário', 'err');
    }
  };

  if (forbidden) return (
    <div className="cf-usr-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-usr">
        <div className="cf-usr-403">
          <div className="cf-usr-403-ic"><Ic d={ICONS.shield} size={26}/></div>
          <div className="cf-usr-403-t">Acesso restrito</div>
          <div className="cf-usr-403-s">Somente usuários administradores podem acessar a gestão de contas. Se você precisa desse acesso, peça a um admin para promover sua conta.</div>
        </div>
      </div>
    </div>
  );

  const CHIPS = [
    { k: 'todos',    label: 'Todos' },
    { k: 'ativos',   label: 'Ativos' },
    { k: 'inativos', label: 'Inativos' },
    { k: 'admins',   label: 'Admins' },
  ];

  const KPIS = [
    { tone: 't-brand', ic: 'users',  val: counts.todos,    lbl: 'Total de contas',   sub: 'no sistema' },
    { tone: 't-ok',    ic: 'check',  val: counts.ativos,   lbl: 'Contas ativas',     sub: 'podem acessar' },
    { tone: 't-warn',  ic: 'power',  val: counts.inativos, lbl: 'Contas inativas',   sub: 'acesso suspenso' },
    { tone: 't-info',  ic: 'shield', val: counts.admins,   lbl: 'Administradores',   sub: 'com privilégios' },
  ];

  return (
    <div className="cf-usr-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-usr">

        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800}}>Usuários</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)',marginTop:4}}>gestão de contas e permissões · área restrita a admins</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={openNovo}><Ic d={ICONS.plus} size={15}/> Novo usuário</button>
        </div>

        {erro && <div className="cf-usr-err">⚠ {erro}</div>}

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
        ) : (
          <>
            <div className="cf-usr-kpis">
              {KPIS.map(k => (
                <div key={k.lbl} className={`cf-usr-kpi ${k.tone}`}>
                  <div className="cf-usr-kpi-top"><span className="cf-usr-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
                  <div className="cf-usr-kpi-val">{k.val}</div>
                  <div><div className="cf-usr-kpi-lbl">{k.lbl}</div><div className="cf-usr-kpi-sub">{k.sub}</div></div>
                </div>
              ))}
            </div>

            <div className="cf-usr-toolbar">
              <div className="cf-usr-srch">
                <Ic d={ICONS.search} size={15} />
                <input placeholder="Buscar por nome ou e-mail…" value={busca} onChange={e => setBusca(e.target.value)} />
                {busca && <button className="x" onClick={() => setBusca('')}>×</button>}
              </div>
              <div className="cf-usr-chips">
                {CHIPS.map(c => (
                  <button key={c.k} className={`cf-usr-chip${filtro === c.k ? ' on' : ''}`} onClick={() => setFiltro(c.k)}>
                    {c.label}<span className="cf-usr-chip-n">{counts[c.k]}</span>
                  </button>
                ))}
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="cf-usr-table"><div className="cf-usr-empty"><div className="cf-usr-empty-ic"><Ic d={ICONS.users} size={20}/></div><div>Nenhum usuário neste filtro</div></div></div>
            ) : (
              <div className="cf-usr-table">
                <div className="cf-usr-thead">
                  <div className="cf-usr-th">Usuário</div>
                  <div className="cf-usr-th">E-mail</div>
                  <div className="cf-usr-th">Tenant</div>
                  <div className="cf-usr-th">Papel</div>
                  <div className="cf-usr-th">Status</div>
                  <div className="cf-usr-th r">Ações</div>
                </div>
                {lista.map(u => {
                  const eusou = u.email === meuEmail;
                  return (
                    <div key={u.id} className={`cf-usr-row${!u.ativo ? ' inactive' : ''}`}>
                      <div className="cf-usr-r-user">
                        <div className={`cf-usr-avatar${!u.ativo ? ' inactive' : ''}`} style={{ '--av': avatarColor(u.nome) }}>
                          {inicial(u.nome)}
                          {u.admin && <span className="cf-usr-avatar-star" title="Admin"><Ic d={ICONS.shield} size={9} sw={2.4}/></span>}
                        </div>
                        <div className="cf-usr-r-info">
                          <div className="cf-usr-r-nm">{u.nome}{eusou && <span className="cf-usr-r-me">você</span>}</div>
                          <div className="cf-usr-r-email">ID #{u.id}</div>
                        </div>
                      </div>
                      <div className="cf-usr-r-email" style={{fontSize:12.5}}>{u.email}</div>
                      <div className="cf-usr-r-tenant">{tenantsMap[u.tenant_id] || (u.tenant_id ? `#${u.tenant_id}` : '—')}</div>
                      <div>{u.admin ? <span className="cf-pill brand">Admin</span> : <span className="cf-pill muted">Usuário</span>}</div>
                      <div>{u.ativo ? <span className="cf-pill ok">Ativo</span> : <span className="cf-pill crit">Inativo</span>}</div>
                      <div className="cf-usr-r-actions">
                        <button className={`cf-usr-ic-btn ${u.ativo ? 'warn' : 'ok'}`} onClick={() => toggleAtivo(u)} disabled={eusou}
                          title={eusou ? 'Você não pode desativar sua própria conta' : (u.ativo ? 'Desativar' : 'Reativar')}>
                          <Ic d={ICONS.power} size={14}/>
                        </button>
                        <button className="cf-usr-ic-btn danger" onClick={() => setConfirmDel(u)} disabled={eusou}
                          title={eusou ? 'Você não pode remover sua própria conta' : 'Remover'}>
                          <Ic d={ICONS.trash} size={14}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {modal === 'novo' && (
        <Portal theme={theme}>
          <div className="cf-usr-mback" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="cf-usr-modal">
              <div className="cf-usr-mhd">
                <div><div className="cf-usr-mtitle">Novo usuário</div><div className="cf-usr-msub">cadastre uma nova conta de acesso</div></div>
                <button className="cf-mclose" onClick={() => setModal(null)}><Ic d={ICONS.x} size={14}/></button>
              </div>
              <div className="cf-usr-mbody">
                {formErr && <div className="cf-usr-err">⚠ {formErr}</div>}

                <div className="cf-usr-field"><label className="cf-usr-label">Nome completo *</label>
                  <input className="cf-usr-input" placeholder="Ex: Maria Silva" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))}/>
                </div>
                <div className="cf-usr-field"><label className="cf-usr-label">E-mail *</label>
                  <input className={`cf-usr-input${form.email && !isEmail(form.email) ? ' err' : ''}`} type="email" placeholder="maria@exemplo.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}/>
                  <span className="cf-usr-hint">Será usado como login</span>
                </div>
                <div className="cf-usr-field"><label className="cf-usr-label">Senha inicial *</label>
                  <div className="cf-usr-input-wrap">
                    <input className="cf-usr-input" style={{paddingRight:38}} type={showSenha ? 'text' : 'password'} placeholder="mínimo 6 caracteres" value={form.senha} onChange={e => setForm(f => ({...f, senha: e.target.value}))}/>
                    <button className="cf-usr-toggle" onClick={() => setShowSenha(v => !v)} type="button"><Ic d={showSenha ? ICONS.eyeOff : ICONS.eye} size={16}/></button>
                  </div>
                  <span className="cf-usr-hint">O usuário pode alterá-la depois em Configurações</span>
                </div>

                <div className="cf-usr-field">
                  <label className="cf-usr-label">Tenant (organização)</label>
                  <div className="cf-usr-tabs">
                    <button className={form.tenant_mode==='existente'?'on':''} onClick={()=>setForm(f=>({...f,tenant_mode:'existente'}))} disabled={tenants.length===0}>Entrar em existente</button>
                    <button className={form.tenant_mode==='novo'?'on':''} onClick={()=>setForm(f=>({...f,tenant_mode:'novo'}))}>Criar novo</button>
                  </div>
                </div>
                {form.tenant_mode === 'existente' ? (
                  <div className="cf-usr-field">
                    <select className="cf-usr-select" value={form.tenant_id} onChange={e => setForm(f => ({...f, tenant_id: e.target.value}))}>
                      <option value="">Selecione um tenant…</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="cf-usr-field">
                    <input className="cf-usr-input" placeholder="Nome do novo tenant" value={form.tenant_nome} onChange={e => setForm(f => ({...f, tenant_nome: e.target.value}))}/>
                    <span className="cf-usr-hint">Um novo espaço de dados será criado. O usuário será o primeiro membro.</span>
                  </div>
                )}

                <div className={`cf-usr-check-row${form.admin ? ' on' : ''}`} onClick={()=>setForm(f => ({...f, admin: !f.admin}))}>
                  <div className="cf-usr-check-box">{form.admin && <Ic d={ICONS.check} size={12} sw={3}/>}</div>
                  <div className="cf-usr-check-info">
                    <div className="cf-usr-check-t">Marcar como administrador</div>
                    <div className="cf-usr-check-s">Pode gerenciar outros usuários e acessar todos os tenants.</div>
                  </div>
                </div>
              </div>
              <div className="cf-usr-mfoot">
                <button className="cf-btn cf-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando} style={{flex:1}}>{salvando ? 'Cadastrando…' : 'Cadastrar usuário'}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {confirmDel && (
        <Portal theme={theme}>
          <div className="cf-usr-mback" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
            <div className="cf-usr-confirm">
              <div className="cf-usr-confirm-t">Remover usuário?</div>
              <div className="cf-usr-confirm-x">Tem certeza que deseja remover <strong>{confirmDel.nome}</strong>? Esta ação não pode ser desfeita. Considere apenas desativar a conta se quiser preservar o histórico.</div>
              <div className="cf-usr-confirm-acts">
                <button className="cf-btn cf-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-danger" onClick={() => remover(confirmDel)}>Remover</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {toast && <div className="cf-toast"><span className={`cf-toast-ic ${toast.tone}`}>{toast.tone === 'ok' ? '✓' : '×'}</span>{toast.msg}</div>}
    </div>
  );
}