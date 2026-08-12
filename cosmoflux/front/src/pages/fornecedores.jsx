import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* ── API ──────────────────────────────────────────────────────────────── */
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = {
  get:  url    => fetch(BASE+url,{headers:h()}).then(async r=>{const d=await r.json().catch(()=>([]));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  post: (u,b)  => fetch(BASE+u,{method:'POST',  headers:h(),body:JSON.stringify(b||{})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:  (u,b)  => fetch(BASE+u,{method:'PUT',   headers:h(),body:JSON.stringify(b||{})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:  url    => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };

/* ── helpers ──────────────────────────────────────────────────────────── */
const fmtBRL = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtTel = (t) => { const d = (t || '').replace(/\D/g, ''); return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') : d.length === 10 ? d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3') : (t || '—'); };
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const avatarColor = (n) => { let hh = 0; for (let i = 0; i < (n || '').length; i++) hh = (hh * 31 + n.charCodeAt(i)) % 360; return `hsl(${hh}, 52%, 52%)`; };

const waLink = (nome, tel) => {
  const digits = (tel || '').replace(/\D/g, '');
  const msg = `Oi, ${nome}! Tudo bem? Sou da CosmoFlux 💜 Preciso fazer um pedido de reposição, quando podemos conversar?`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
};

const FOR_EMPTY = { nome: '', contato: '', telefone: '', email: '' };

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>
    {d}
  </svg>
);
const ICONS = {
  edit:   <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></>,
  trash:  <><path d="M3 6h18"/><path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
  plus:   <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  x:      <><path d="M18 6L6 18M6 6l12 12"/></>,
  phone:  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>,
  mail:   <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
  user:   <><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></>,
  wa:     <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.6 11.6 0 0 1-4.8-4.3c-.4-.6-.9-1.5-.9-2.4 0-.9.5-1.3.7-1.5.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.5.2.4.8 1.2 1.6 1.9 1 .9 1.8 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z"/>,
  copy:   <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>,
  sort:   <><path d="M3 6h12M3 12h9M3 18h6"/><path d="m18 9 3-3-3-3M21 6v12"/></>,
  grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  list:   <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  truck:  <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  box:    <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></>,
  bell:   <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  spark:  <path d="M12 2.5 14.2 9 21 11l-6.8 2L12 19.5 9.8 13 3 11l6.8-2L12 2.5Z"/>,
};

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-for-root *,.cf-for-root *::before,.cf-for-root *::after{box-sizing:border-box;}
.cf-for-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--kpi-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cffIn .3s ease both;}
@keyframes cffIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-for-root[data-theme="dark"],.cf-for-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-for-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-for-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-for-portal{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.cf-for-portal[data-theme="dark"],.cf-for-portal:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-for-portal[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-for-portal{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-for-portal *,.cf-for-portal *::before,.cf-for-portal *::after{box-sizing:border-box;}

.cf-for{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}

.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;text-decoration:none;}
.cf-btn:hover{border-color:var(--border-strong);}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover{filter:brightness(1.08);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-btn-wa{background:color-mix(in oklab,#25d366 12%,transparent);color:#1ebe5a;border-color:color-mix(in oklab,#25d366 28%,transparent);}
.cf-btn-wa:hover{background:color-mix(in oklab,#25d366 20%,transparent);}
.cf-btn.sm{padding:7px 12px;font-size:12px;}
.cf-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-mclose{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-mclose:hover{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 35%,transparent);}
.cf-att-pulse{width:9px;height:9px;border-radius:50%;background:var(--crit);flex-shrink:0;animation:cffPulse 1.8s infinite;}
@keyframes cffPulse{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--crit) 60%,transparent);}70%{box-shadow:0 0 0 7px transparent;}100%{box-shadow:0 0 0 0 transparent;}}

.cf-for-alert{display:flex;align-items:center;gap:12px;padding:13px 18px;background:color-mix(in oklab,var(--warn) 10%,var(--surface));border:1px solid color-mix(in oklab,var(--warn) 32%,transparent);border-radius:var(--radius);}
.cf-for-alert-txt{font-size:13px;font-weight:500;}
.cf-for-alert-txt strong{color:var(--warn);font-weight:700;}
.cf-for-alert .cf-btn{margin-left:auto;}

.cf-for-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-for-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--kpi-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-for-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-for-kpi.t-brand{--tone:var(--brand);}
.cf-for-kpi.t-ok{--tone:var(--ok);}
.cf-for-kpi.t-warn{--tone:var(--warn);}
.cf-for-kpi.t-crit{--tone:var(--crit);}
.cf-for-kpi.hero{background:linear-gradient(135deg,color-mix(in oklab,var(--warn) 10%,var(--surface)),var(--surface));}
.cf-for-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-for-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-for-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-for-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-for-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-for-kpi-cta{align-self:flex-start;background:none;border:none;color:var(--warn);font-size:11.5px;font-weight:700;cursor:pointer;padding:0;}

.cf-for-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.cf-for-srch{display:flex;align-items:center;gap:9px;flex:1;min-width:230px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.cf-for-srch:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-for-srch input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.cf-for-srch input::placeholder{color:var(--text-muted);}
.cf-for-srch .x{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:17px;}
.cf-for-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-for-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-ui);}
.cf-for-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-for-chip-dot{width:7px;height:7px;border-radius:50%;}
.cf-for-chip-n{font-family:var(--font-mono);font-size:10px;opacity:.7;}
.cf-for-tools-right{display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap;}
.cf-for-select{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 11px;color:var(--text-muted);}
.cf-for-select select{background:none;border:none;outline:none;font-family:var(--font-ui);font-size:12.5px;color:var(--text);cursor:pointer;}
.cf-for-seg{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:3px;}
.cf-for-seg button{width:30px;height:28px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-for-seg button.on{background:var(--brand-soft);color:var(--brand);}

.cf-for-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;background:var(--av,var(--brand));flex-shrink:0;}

.cf-for-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--gap);}
.cf-for-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;cursor:pointer;transition:all .16s;display:flex;flex-direction:column;gap:13px;}
.cf-for-card:hover{border-color:var(--border-strong);transform:translateY(-2px);}
.cf-for-card.alerta{border-left:3px solid var(--warn);}
.cf-for-card-top{display:flex;gap:11px;align-items:flex-start;}
.cf-for-card-id{min-width:0;flex:1;}
.cf-for-card-name{font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-for-card-tel{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-for-card-mid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.cf-for-fld-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:2px;}
.cf-for-fld-v{font-size:13px;font-weight:700;font-family:var(--font-mono);}
.cf-for-fld-v.muted{color:var(--text-muted);}
.cf-for-fld-v.ok{color:var(--ok);}
.cf-for-fld-v.warn{color:var(--warn);}
.cf-for-fld-v.crit{color:var(--crit);}
.cf-for-card-foot{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border);}
.cf-for-wa{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:11.5px;font-weight:600;color:#1ebe5a;text-decoration:none;}
.cf-for-ic-btn{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-for-ic-btn.danger{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 25%,transparent);}

.cf-for-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-for-thead{display:grid;grid-template-columns:2.5fr 1fr 80px 1fr 1fr 130px;gap:12px;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-for-th{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-for-th.r{text-align:right;}
.cf-for-row{display:grid;grid-template-columns:2.5fr 1fr 80px 1fr 1fr 130px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;}
.cf-for-row:last-child{border-bottom:none;}
.cf-for-row:hover{background:var(--surface-2);}
.cf-for-r-name{display:flex;align-items:center;gap:10px;min-width:0;}
.cf-for-r-nm{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-for-r-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-for-cell.r{text-align:right;justify-self:end;}
.cf-for-r-num{font-family:var(--font-mono);font-weight:700;font-size:12.5px;}
.cf-for-r-num.muted{color:var(--text-muted);}
.cf-for-r-num.warn{color:var(--warn);}
.cf-for-r-num.crit{color:var(--crit);}
.cf-for-r-actions{display:flex;gap:5px;justify-content:flex-end;}
.cf-for-empty{padding:60px 20px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px;}
.cf-for-empty-ic{width:44px;height:44px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);}
@media(max-width:1000px){.cf-for-thead,.cf-for-row{grid-template-columns:2fr 1fr 110px;}.cf-for-th:nth-child(2),.cf-for-th:nth-child(3),.cf-for-th:nth-child(4),.cf-for-row>:nth-child(2),.cf-for-row>:nth-child(3),.cf-for-row>:nth-child(4){display:none;}}

/* painel central via Portal */
.cf-for-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:cffFade .2s ease both;}
@keyframes cffFade{from{opacity:0}to{opacity:1}}
.cf-for-panel{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-for-panel-hd{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.cf-for-panel-id{display:flex;gap:13px;align-items:flex-start;min-width:0;}
.cf-for-panel-id .cf-for-avatar{width:48px;height:48px;font-size:18px;}
.cf-for-panel-title{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.25;}
.cf-for-panel-sub{font-size:11.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.cf-for-panel-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:20px;}
.cf-for-panel-body::-webkit-scrollbar{width:5px;}
.cf-for-panel-body::-webkit-scrollbar-thumb{background:var(--track);border-radius:3px;}
.cf-for-sec-t{font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:11px;display:flex;align-items:center;justify-content:space-between;}
.cf-for-sec-t .muted{font-weight:500;text-transform:none;letter-spacing:0;}
.cf-for-contact{display:flex;flex-direction:column;gap:9px;}
.cf-for-contact-row{display:flex;align-items:center;gap:10px;}
.cf-for-contact-ic{width:28px;height:28px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;}
.cf-for-contact-info{flex:1;min-width:0;}
.cf-for-contact-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);}
.cf-for-contact-v{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-for-copy{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-for-copy:hover{color:var(--brand);}
.cf-for-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.cf-for-stat-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:3px;}
.cf-for-stat-v{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.cf-for-stat-v.ok{color:var(--ok);}
.cf-for-stat-v.warn{color:var(--warn);}
.cf-for-stat-v.crit{color:var(--crit);}
.cf-for-prods{display:flex;flex-direction:column;gap:6px;}
.cf-for-prod{display:grid;grid-template-columns:1fr 60px 90px;gap:10px;align-items:center;padding:9px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;}
.cf-for-prod-nm{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-for-prod-sub{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:1px;}
.cf-for-prod-est{font-family:var(--font-mono);font-size:12px;font-weight:700;text-align:right;}
.cf-for-prod-est.ok{color:var(--ok);}
.cf-for-prod-est.warn{color:var(--warn);}
.cf-for-prod-est.crit{color:var(--crit);}
.cf-for-prod-preco{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:right;}
.cf-for-panel-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0;}

/* modal cadastro/edit */
.cf-for-mback{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:210;display:flex;align-items:center;justify-content:center;padding:20px;animation:cffFade .2s ease both;}
.cf-for-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-for-mhd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cf-for-mtitle{font-size:15px;font-weight:800;}
.cf-for-msub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-for-mbody{padding:18px 22px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;}
.cf-for-mfoot{padding:13px 22px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}
.cf-for-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-for-form-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.cf-for-field{display:flex;flex-direction:column;gap:5px;}
.cf-for-field.full{grid-column:1/-1;}
.cf-for-label{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-for-input{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .18s;}
.cf-for-input:focus{border-color:var(--brand-line);}
.cf-for-confirm{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:380px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-for-confirm-t{font-size:15px;font-weight:800;}
.cf-for-confirm-x{font-size:13px;color:var(--text-dim);line-height:1.5;}
.cf-for-confirm-acts{display:flex;gap:9px;}
.cf-for-confirm-acts .cf-btn{flex:1;justify-content:center;}

.cf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:cffFade .3s ease both;white-space:nowrap;}
.cf-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.cf-toast-ic.warn{background:color-mix(in oklab,var(--warn) 14%,transparent);color:var(--warn);}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}

.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cffSh 1.5s infinite;border-radius:8px;}
@keyframes cffSh{from{background-position:200% 0}to{background-position:-200% 0}}

@media(max-width:1100px){.cf-for-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-for-kpis{grid-template-columns:1fr;}.cf-for-form-row{grid-template-columns:1fr;}}
`;

/* ── Portal ───────────────────────────────────────────────────────────── */
function Portal({children, theme}) {
  useEffect(()=>{ const p=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=p; }; },[]);
  return createPortal(<div className="cf-for-portal" data-theme={theme}>{children}</div>, document.body);
}

/* ── Painel de detalhe (MODAL CENTRAL via Portal) ─────────────────────── */
function FornecedorPanel({ forn, produtos, loadingProds, onClose, onEdit, onDelete, onToast, theme }) {
  if (!forn) return null;
  const copiar = (t, label) => { navigator.clipboard && navigator.clipboard.writeText(t); onToast(`${label} copiado`); };

  const criticos = produtos.filter(p => p.status === 'critico');
  const esgotados = produtos.filter(p => p.status === 'esgotado');
  const valorTotal = produtos.reduce((a,p) => a + (p.preco_custo||0) * (p.estoque_atual||0), 0);

  return (
    <Portal theme={theme}>
      <div className="cf-for-ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="cf-for-panel">
          <div className="cf-for-panel-hd">
            <div className="cf-for-panel-id">
              <div className="cf-for-avatar" style={{ '--av': avatarColor(forn.nome) }}>{inicial(forn.nome)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="cf-for-panel-title">{forn.nome}</div>
                <div className="cf-for-panel-sub">{forn.n_produtos} produto(s) fornecido(s)</div>
                {forn.precisa_reposicao > 0 && <div style={{marginTop:9}}><span className="cf-pill warn">Precisa reposição · {forn.precisa_reposicao} item(s)</span></div>}
              </div>
            </div>
            <button className="cf-mclose" onClick={onClose}><Ic d={ICONS.x} size={14}/></button>
          </div>

          <div className="cf-for-panel-body">
            <section>
              <div className="cf-for-sec-t">Contato</div>
              <div className="cf-for-contact">
                <div className="cf-for-contact-row">
                  <span className="cf-for-contact-ic"><Ic d={ICONS.user} size={14}/></span>
                  <div className="cf-for-contact-info">
                    <div className="cf-for-contact-l">Pessoa de contato</div>
                    <div className="cf-for-contact-v">{forn.contato || '—'}</div>
                  </div>
                </div>
                <div className="cf-for-contact-row">
                  <span className="cf-for-contact-ic"><Ic d={ICONS.phone} size={14}/></span>
                  <div className="cf-for-contact-info">
                    <div className="cf-for-contact-l">Telefone / WhatsApp</div>
                    <div className="cf-for-contact-v">{fmtTel(forn.telefone)}</div>
                  </div>
                  {forn.telefone && <button className="cf-for-copy" onClick={()=>copiar(fmtTel(forn.telefone), 'Telefone')} title="Copiar"><Ic d={ICONS.copy} size={14}/></button>}
                </div>
                <div className="cf-for-contact-row">
                  <span className="cf-for-contact-ic"><Ic d={ICONS.mail} size={14}/></span>
                  <div className="cf-for-contact-info">
                    <div className="cf-for-contact-l">E-mail</div>
                    <div className="cf-for-contact-v">{forn.email || '—'}</div>
                  </div>
                  {forn.email && <button className="cf-for-copy" onClick={()=>copiar(forn.email, 'E-mail')} title="Copiar"><Ic d={ICONS.copy} size={14}/></button>}
                </div>
              </div>
            </section>

            <section>
              <div className="cf-for-sec-t">Estoque fornecido</div>
              <div className="cf-for-stats">
                <div><div className="cf-for-stat-l">Produtos</div><div className="cf-for-stat-v">{forn.n_produtos}</div></div>
                <div><div className="cf-for-stat-l">Em estoque</div><div className="cf-for-stat-v ok">{fmtBRL(valorTotal, 0)}</div></div>
                <div><div className="cf-for-stat-l">Precisa repor</div><div className={`cf-for-stat-v ${forn.precisa_reposicao>0?'warn':'ok'}`}>{forn.precisa_reposicao || '—'}</div></div>
              </div>
            </section>

            {forn.telefone && forn.precisa_reposicao > 0 && (
              <a className="cf-btn cf-btn-wa" style={{ justifyContent: 'center' }} href={waLink(forn.contato || forn.nome, forn.telefone)} target="_blank" rel="noreferrer">
                <Ic d={ICONS.wa} size={15}/> Fazer pedido no WhatsApp
              </a>
            )}

            <section>
              <div className="cf-for-sec-t">Produtos deste fornecedor <span className="muted">{produtos.length} item(s)</span></div>
              {loadingProds ? (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="cf-skel" style={{height:44}}/>)}</div>
              ) : produtos.length === 0 ? (
                <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>Nenhum produto vinculado</div>
              ) : (
                <div className="cf-for-prods">
                  {[...produtos].sort((a,b) => {
                    // ordena por urgência: esgotados > criticos > ok
                    const ord = { esgotado: 0, critico: 1, ok: 2 };
                    return (ord[a.status] ?? 3) - (ord[b.status] ?? 3);
                  }).map(p => {
                    const cls = p.status === 'esgotado' ? 'crit' : p.status === 'critico' ? 'warn' : 'ok';
                    return (
                      <div key={p.id} className="cf-for-prod">
                        <div style={{minWidth:0}}>
                          <div className="cf-for-prod-nm">{p.nome}</div>
                          <div className="cf-for-prod-sub">SKU {p.sku || '—'}</div>
                        </div>
                        <div className={`cf-for-prod-est ${cls}`}>{p.estoque_atual} {p.unidade || 'un'}</div>
                        <div className="cf-for-prod-preco">custo {fmtBRL(p.preco_custo)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="cf-for-panel-foot">
            <button className="cf-btn cf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(forn)}><Ic d={ICONS.edit} size={14}/> Editar</button>
            <button className="cf-btn cf-btn-danger" onClick={() => onDelete(forn)}><Ic d={ICONS.trash} size={14}/></button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Fornecedores() {
  const [theme, setTheme] = useState(getDocTheme);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [ordem, setOrdem] = useState('nome');
  const [view, setView] = useState('grade');
  const [sel, setSel] = useState(null);
  const [produtosDoSel, setProdutosDoSel] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [modal, setModal] = useState(null); // {editId} | 'novo'
  const [form, setForm] = useState(FOR_EMPTY);
  const [formErr, setFormErr] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  const showToast = (msg, tone = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const data = await api.get('/fornecedores');
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar os fornecedores.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadProdutosDoSel = useCallback(async (id) => {
    setLoadingProds(true); setProdutosDoSel([]);
    try { const d = await api.get(`/fornecedores/${id}/produtos`); setProdutosDoSel(Array.isArray(d) ? d : []); }
    catch (e) { showToast(e.message, 'err'); }
    finally { setLoadingProds(false); }
  }, []);
  useEffect(() => { if (sel) loadProdutosDoSel(sel.id); else setProdutosDoSel([]); }, [sel, loadProdutosDoSel]);

  const counts = useMemo(() => ({
    todos: fornecedores.length,
    alerta: fornecedores.filter(f => f.precisa_reposicao > 0).length,
    ok: fornecedores.filter(f => f.precisa_reposicao === 0).length,
  }), [fornecedores]);

  const kpis = useMemo(() => ({
    total: fornecedores.length,
    valorEstoque: fornecedores.reduce((a, f) => a + (f.valor_estoque || 0), 0),
    produtosTotais: fornecedores.reduce((a, f) => a + (f.n_produtos || 0), 0),
    precisaReposicao: fornecedores.reduce((a, f) => a + (f.precisa_reposicao || 0), 0),
    fornecedoresAlerta: counts.alerta,
  }), [fornecedores, counts]);

  const lista = useMemo(() => {
    let r = fornecedores.filter(f => {
      if (filtro === 'alerta' && f.precisa_reposicao === 0) return false;
      if (filtro === 'ok' && f.precisa_reposicao > 0) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(f.nome.toLowerCase().includes(q) || (f.contato || '').toLowerCase().includes(q) || (f.telefone || '').includes(q) || (f.email || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const cmp = {
      nome: (a, b) => a.nome.localeCompare(b.nome),
      produtos: (a, b) => (b.n_produtos||0) - (a.n_produtos||0),
      estoque: (a, b) => (b.valor_estoque||0) - (a.valor_estoque||0),
      urgencia: (a, b) => (b.precisa_reposicao||0) - (a.precisa_reposicao||0),
    }[ordem];
    return [...r].sort(cmp);
  }, [fornecedores, filtro, busca, ordem]);

  const openNovo = () => { setForm(FOR_EMPTY); setFormErr(''); setModal('novo'); };
  const openEdit = (f) => {
    setForm({ nome: f.nome, contato: f.contato || '', telefone: f.telefone || '', email: f.email || '' });
    setFormErr(''); setModal({ editId: f.id });
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setFormErr('O nome é obrigatório.'); return; }
    setSalvando(true); setFormErr('');
    try {
      const payload = {
        nome: form.nome.trim(),
        contato: form.contato.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
      };
      if (modal.editId) {
        await api.put(`/fornecedores/${modal.editId}`, payload);
        showToast('Fornecedor atualizado');
      } else {
        await api.post('/fornecedores', payload);
        showToast('Fornecedor cadastrado');
      }
      setModal(null);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Erro ao salvar fornecedor.');
    } finally { setSalvando(false); }
  };

  const remover = async (f) => {
    try {
      await api.del(`/fornecedores/${f.id}`);
      setConfirmDel(null); setSel(null);
      showToast('Fornecedor removido', 'err');
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao remover fornecedor', 'err');
    }
  };

  const CHIPS = [
    { k: 'todos',  label: 'Todos',            dot: null },
    { k: 'alerta', label: 'Precisa reposição', dot: 'var(--warn)' },
    { k: 'ok',     label: 'Em dia',            dot: 'var(--ok)' },
  ];
  const ORD_LABEL = { nome: 'Nome (A–Z)', produtos: 'Mais produtos', estoque: 'Maior estoque', urgencia: 'Mais urgentes' };

  const KPIS = [
    { tone: 't-brand', ic: 'truck', val: kpis.total, lbl: 'Fornecedores ativos', sub: `${kpis.produtosTotais} produto(s) no total` },
    { tone: 't-ok',    ic: 'box',   val: fmtBRL(kpis.valorEstoque, 0), lbl: 'Valor em estoque', sub: 'a preço de custo' },
    { tone: 't-warn',  ic: 'bell',  val: kpis.precisaReposicao,    lbl: 'Itens para repor', sub: `de ${kpis.fornecedoresAlerta} fornecedor(es)`, hero: kpis.precisaReposicao > 0, cta: kpis.precisaReposicao > 0 ? 'Ver alertas' : null },
    { tone: 't-brand', ic: 'spark', val: kpis.total ? Math.round(kpis.produtosTotais/kpis.total) : 0, lbl: 'Média produtos/fornecedor', sub: 'diversidade da carteira' },
  ];

  return (
    <div className="cf-for-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-for">

        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800}}>Fornecedores</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)',marginTop:4}}>{fornecedores.length} fornecedor(es) cadastrado(s)</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={openNovo}><Ic d={ICONS.plus} size={15}/> Novo fornecedor</button>
        </div>

        {erro && <div className="cf-for-err">⚠ {erro}</div>}

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
        ) : (
          <>
            {kpis.precisaReposicao > 0 && (
              <div className="cf-for-alert">
                <span className="cf-att-pulse" />
                <span className="cf-for-alert-txt"><strong>{kpis.precisaReposicao} produto(s) precisam de reposição</strong> — de {kpis.fornecedoresAlerta} fornecedor(es). Combine o pedido pelo WhatsApp.</span>
                <button className="cf-btn cf-btn-ghost sm" onClick={() => setFiltro('alerta')}>Ver fornecedores</button>
              </div>
            )}

            <div className="cf-for-kpis">
              {KPIS.map(k => (
                <div key={k.lbl} className={`cf-for-kpi ${k.tone}${k.hero ? ' hero' : ''}`}>
                  <div className="cf-for-kpi-top"><span className="cf-for-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
                  <div className="cf-for-kpi-val">{k.val}</div>
                  <div><div className="cf-for-kpi-lbl">{k.lbl}</div><div className="cf-for-kpi-sub">{k.sub}</div></div>
                  {k.cta && <button className="cf-for-kpi-cta" onClick={() => setFiltro('alerta')}>{k.cta} →</button>}
                </div>
              ))}
            </div>

            <div className="cf-for-toolbar">
              <div className="cf-for-srch">
                <Ic d={ICONS.search} size={15} />
                <input placeholder="Buscar nome, contato, telefone ou e-mail…" value={busca} onChange={e => setBusca(e.target.value)} />
                {busca && <button className="x" onClick={() => setBusca('')}>×</button>}
              </div>
              <div className="cf-for-chips">
                {CHIPS.map(c => (
                  <button key={c.k} className={`cf-for-chip${filtro === c.k ? ' on' : ''}`} onClick={() => setFiltro(c.k)}>
                    {c.dot && <span className="cf-for-chip-dot" style={{ background: c.dot }} />}{c.label}<span className="cf-for-chip-n">{counts[c.k]}</span>
                  </button>
                ))}
              </div>
              <div className="cf-for-tools-right">
                <div className="cf-for-select">
                  <Ic d={ICONS.sort} size={14} />
                  <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                    {Object.entries(ORD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="cf-for-seg">
                  <button className={view === 'grade' ? 'on' : ''} onClick={() => setView('grade')} title="Grade"><Ic d={ICONS.grid} size={15}/></button>
                  <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')} title="Lista"><Ic d={ICONS.list} size={15}/></button>
                </div>
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="cf-for-table"><div className="cf-for-empty"><div className="cf-for-empty-ic"><Ic d={ICONS.truck} size={20}/></div><div>Nenhum fornecedor neste filtro</div></div></div>
            ) : view === 'grade' ? (
              <div className="cf-for-grid">
                {lista.map(f => (
                  <div key={f.id} className={`cf-for-card${f.precisa_reposicao>0?' alerta':''}`} onClick={() => setSel(f)}>
                    <div className="cf-for-card-top">
                      <div className="cf-for-avatar" style={{ '--av': avatarColor(f.nome) }}>{inicial(f.nome)}</div>
                      <div className="cf-for-card-id">
                        <div className="cf-for-card-name">{f.nome}</div>
                        <div className="cf-for-card-tel">{f.contato || '—'} · {fmtTel(f.telefone)}</div>
                      </div>
                    </div>
                    <div className="cf-for-card-mid">
                      <div><div className="cf-for-fld-l">Produtos</div><div className="cf-for-fld-v">{f.n_produtos}</div></div>
                      <div><div className="cf-for-fld-l">Em estoque</div><div className="cf-for-fld-v muted">{fmtBRL(f.valor_estoque, 0)}</div></div>
                      <div><div className="cf-for-fld-l">Repor</div><div className={`cf-for-fld-v ${f.precisa_reposicao>0?'warn':'ok'}`}>{f.precisa_reposicao || '—'}</div></div>
                    </div>
                    <div className="cf-for-card-foot" onClick={e => e.stopPropagation()}>
                      {f.precisa_reposicao > 0 ? <span className="cf-pill warn">Precisa reposição</span> : <span className="cf-pill ok">Em dia</span>}
                      {f.telefone && <a className="cf-for-wa" href={waLink(f.contato || f.nome, f.telefone)} target="_blank" rel="noreferrer" title="WhatsApp"><Ic d={ICONS.wa} size={14}/> WhatsApp</a>}
                      <button className="cf-for-ic-btn" onClick={() => openEdit(f)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cf-for-table">
                <div className="cf-for-thead">
                  <div className="cf-for-th">Fornecedor</div>
                  <div className="cf-for-th">Contato</div>
                  <div className="cf-for-th r">Produtos</div>
                  <div className="cf-for-th r">Em estoque</div>
                  <div className="cf-for-th">Status</div>
                  <div className="cf-for-th r">Ações</div>
                </div>
                {lista.map(f => (
                  <div key={f.id} className="cf-for-row" onClick={() => setSel(f)}>
                    <div className="cf-for-r-name">
                      <div className="cf-for-avatar" style={{ '--av': avatarColor(f.nome) }}>{inicial(f.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div className="cf-for-r-nm">{f.nome}</div>
                        <div className="cf-for-r-sub">{f.email || fmtTel(f.telefone) || '—'}</div>
                      </div>
                    </div>
                    <div className="cf-for-cell"><span style={{fontSize:12,color:'var(--text-dim)'}}>{f.contato || '—'}</span></div>
                    <div className="cf-for-cell r"><span className="cf-for-r-num">{f.n_produtos}</span></div>
                    <div className="cf-for-cell r"><span className="cf-for-r-num muted">{fmtBRL(f.valor_estoque, 0)}</span></div>
                    <div className="cf-for-cell">{f.precisa_reposicao > 0 ? <span className="cf-pill warn">Repor {f.precisa_reposicao}</span> : <span className="cf-pill ok">Em dia</span>}</div>
                    <div className="cf-for-cell r" onClick={e => e.stopPropagation()}>
                      <div className="cf-for-r-actions">
                        {f.telefone && <a className="cf-for-ic-btn" href={waLink(f.contato || f.nome, f.telefone)} target="_blank" rel="noreferrer" title="WhatsApp" style={{color:'#1ebe5a'}}><Ic d={ICONS.wa} size={14}/></a>}
                        <button className="cf-for-ic-btn" onClick={() => openEdit(f)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
                        <button className="cf-for-ic-btn danger" onClick={() => setConfirmDel(f)} title="Remover"><Ic d={ICONS.trash} size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {sel && (
        <FornecedorPanel forn={fornecedores.find(f => f.id === sel.id) || sel} produtos={produtosDoSel} loadingProds={loadingProds}
          onClose={() => setSel(null)} onEdit={openEdit} onDelete={setConfirmDel} onToast={showToast} theme={theme}/>
      )}

      {modal && (
        <Portal theme={theme}>
          <div className="cf-for-mback" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="cf-for-modal">
              <div className="cf-for-mhd">
                <div><div className="cf-for-mtitle">{modal.editId ? 'Editar fornecedor' : 'Novo fornecedor'}</div><div className="cf-for-msub">{modal.editId ? 'Atualize os dados' : 'Cadastre um novo fornecedor'}</div></div>
                <button className="cf-mclose" onClick={() => setModal(null)}><Ic d={ICONS.x} size={14}/></button>
              </div>
              <div className="cf-for-mbody">
                {formErr && <div className="cf-for-err">⚠ {formErr}</div>}
                <div className="cf-for-field full"><label className="cf-for-label">Nome / Razão social *</label><input className="cf-for-input" placeholder="Ex: Distribuidora Bela" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}/></div>
                <div className="cf-for-field full"><label className="cf-for-label">Pessoa de contato</label><input className="cf-for-input" placeholder="Ex: João Silva" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}/></div>
                <div className="cf-for-form-row">
                  <div className="cf-for-field"><label className="cf-for-label">Telefone / WhatsApp</label><input className="cf-for-input" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}/></div>
                  <div className="cf-for-field"><label className="cf-for-label">E-mail</label><input className="cf-for-input" type="email" placeholder="contato@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/></div>
                </div>
              </div>
              <div className="cf-for-mfoot">
                <button className="cf-btn cf-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : (modal.editId ? 'Salvar' : 'Cadastrar')}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {confirmDel && (
        <Portal theme={theme}>
          <div className="cf-for-mback" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
            <div className="cf-for-confirm">
              <div className="cf-for-confirm-t">Remover fornecedor?</div>
              <div className="cf-for-confirm-x">Tem certeza que deseja remover <strong>{confirmDel.nome}</strong>? Produtos vinculados serão mantidos, apenas sem fornecedor associado.</div>
              <div className="cf-for-confirm-acts">
                <button className="cf-btn cf-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-danger" onClick={() => remover(confirmDel)}>Remover</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {toast && <div className="cf-toast"><span className={`cf-toast-ic ${toast.tone}`}>{toast.tone === 'ok' ? '✓' : toast.tone === 'warn' ? '↓' : '×'}</span>{toast.msg}</div>}
    </div>
  );
}