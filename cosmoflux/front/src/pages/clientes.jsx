import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

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
const fmtBRLc = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtTelc = (t) => { const d = (t || '').replace(/\D/g, ''); return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') : (t || '—'); };
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const avatarColor = (n) => { let hh = 0; for (let i = 0; i < (n || '').length; i++) hh = (hh * 31 + n.charCodeAt(i)) % 360; return `hsl(${hh}, 52%, 52%)`; };
const txt = v => v==null ? '' : (typeof v === 'object' ? (v.nome || v.produto || '') : String(v));

const VENDA_PAY = {
  pago:      { cls: 'ok',   label: 'Pago' },
  em_aberto: { cls: 'warn', label: 'Em aberto' },
  vencido:   { cls: 'crit', label: 'Vencido' },
  cancelado: { cls: 'info', label: 'Cancelado' },
};
function VPill({ v }) { const m = VENDA_PAY[v.status_pagamento] || VENDA_PAY.em_aberto; return <span className={`cf-pill ${m.cls}`}>{m.label}</span>; }

const ALERTA_PILL = { vencido: { cls: 'crit', label: 'Vencido' }, proximo: { cls: 'warn', label: 'Vence em breve' } };

const waLink = (cli) => {
  const tel = (cli.telefone || '').replace(/\D/g, '');
  const msg = cli.total_em_aberto > 0
    ? `Oi, ${cli.nome.split(' ')[0]}! Tudo bem? Passando pra lembrar do seu saldo de ${fmtBRLc(cli.total_em_aberto)} aqui na loja 💜 Quando puder, me avisa pra gente acertar!`
    : `Oi, ${cli.nome.split(' ')[0]}! Tudo bem? Chegou novidade aqui na loja, quer dar uma olhada? 💜`;
  return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
};

const CLI_EMPTY = { nome: '', telefone: '', email: '', cpf: '', cidade: '', endereco: '', cep: '', observacao: '' };

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>
    {d}
  </svg>
);
const ICONS = {
  edit:  <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></>,
  trash: <><path d="M3 6h18"/><path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>,
  mail:  <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
  pin:   <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  wa:    <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.6 11.6 0 0 1-4.8-4.3c-.4-.6-.9-1.5-.9-2.4 0-.9.5-1.3.7-1.5.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.5.2.4.8 1.2 1.6 1.9 1 .9 1.8 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z"/>,
  copy:  <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  sort:  <><path d="M3 6h12M3 12h9M3 18h6"/><path d="m18 9 3-3-3-3M21 6v12"/></>,
  grid:  <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  list:  <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  spark: <path d="M12 2.5 14.2 9 21 11l-6.8 2L12 19.5 9.8 13 3 11l6.8-2L12 2.5Z"/>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5"/><path d="M21 20a6 6 0 0 0-4-5.6"/></>,
  x:     <><path d="M18 6L6 18M6 6l12 12"/></>,
  plus:  <><path d="M12 5v14"/><path d="M5 12h14"/></>,
};

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-cli-root *,.cf-cli-root *::before,.cf-cli-root *::after{box-sizing:border-box;}
.cf-cli-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--kpi-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cfcIn .3s ease both;}
@keyframes cfcIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-cli-root[data-theme="dark"],.cf-cli-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-cli-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-cli-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-cli-portal{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.cf-cli-portal[data-theme="dark"],.cf-cli-portal:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-cli-portal[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-cli-portal{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-cli-portal *,.cf-cli-portal *::before,.cf-cli-portal *::after{box-sizing:border-box;}

.cf-cl{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}

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
.cf-pill.info{background:var(--brand-soft);color:var(--brand);}
.cf-mclose{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-mclose:hover{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 35%,transparent);}
.cf-att-pulse{width:9px;height:9px;border-radius:50%;background:var(--crit);flex-shrink:0;animation:cfcPulse 1.8s infinite;}
@keyframes cfcPulse{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--crit) 60%,transparent);}70%{box-shadow:0 0 0 7px transparent;}100%{box-shadow:0 0 0 0 transparent;}}

.cf-cl-alert{display:flex;align-items:center;gap:12px;padding:13px 18px;background:color-mix(in oklab,var(--crit) 10%,var(--surface));border:1px solid color-mix(in oklab,var(--crit) 32%,transparent);border-radius:var(--radius);}
.cf-cl-alert-txt{font-size:13px;font-weight:500;}
.cf-cl-alert-txt strong{color:var(--crit);font-weight:700;}
.cf-cl-alert .cf-btn{margin-left:auto;}

.cf-cl-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-cl-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--kpi-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-cl-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-cl-kpi.t-brand{--tone:var(--brand);}
.cf-cl-kpi.t-ok{--tone:var(--ok);}
.cf-cl-kpi.t-warn{--tone:var(--warn);}
.cf-cl-kpi.t-crit{--tone:var(--crit);}
.cf-cl-kpi.hero{background:linear-gradient(135deg,color-mix(in oklab,var(--warn) 11%,var(--surface)),var(--surface));}
.cf-cl-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-cl-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-cl-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-cl-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-cl-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-cl-kpi-cta{align-self:flex-start;background:none;border:none;color:var(--crit);font-size:11.5px;font-weight:700;cursor:pointer;padding:0;}

.cf-cl-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.cf-cl-srch{display:flex;align-items:center;gap:9px;flex:1;min-width:230px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.cf-cl-srch:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-cl-srch input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.cf-cl-srch input::placeholder{color:var(--text-muted);}
.cf-cl-srch .x{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:17px;}
.cf-cl-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-cl-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-ui);}
.cf-cl-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-cl-chip-dot{width:7px;height:7px;border-radius:50%;}
.cf-cl-chip-n{font-family:var(--font-mono);font-size:10px;opacity:.7;}
.cf-cl-tools-right{display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap;}
.cf-cl-select{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 11px;color:var(--text-muted);}
.cf-cl-select select{background:none;border:none;outline:none;font-family:var(--font-ui);font-size:12.5px;color:var(--text);cursor:pointer;}
.cf-cl-seg{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:3px;}
.cf-cl-seg button{width:30px;height:28px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-cl-seg button.on{background:var(--brand-soft);color:var(--brand);}

.cf-cl-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;background:var(--av,var(--brand));flex-shrink:0;}

.cf-cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--gap);}
.cf-cl-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;cursor:pointer;transition:all .16s;display:flex;flex-direction:column;gap:13px;}
.cf-cl-card:hover{border-color:var(--border-strong);transform:translateY(-2px);}
.cf-cl-card.al-vencido{border-left:3px solid var(--crit);}
.cf-cl-card.al-proximo{border-left:3px solid var(--warn);}
.cf-cl-card-top{display:flex;gap:11px;align-items:flex-start;}
.cf-cl-card-id{min-width:0;flex:1;}
.cf-cl-card-nmrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.cf-cl-card-name{font-size:14.5px;font-weight:700;}
.cf-cl-card-tel{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-cl-card-loc{font-size:10.5px;color:var(--text-muted);margin-top:2px;}
.cf-cl-card-mid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.cf-cl-fld-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:2px;}
.cf-cl-fld-v{font-size:13px;font-weight:700;font-family:var(--font-mono);}
.cf-cl-fld-v.muted{color:var(--text-muted);}
.cf-cl-fld-v.ok{color:var(--ok);}
.cf-cl-fld-v.warn{color:var(--warn);}
.cf-cl-fld-v.crit{color:var(--crit);}
.cf-cl-card-health{display:flex;flex-direction:column;gap:6px;}
.cf-cl-health-top{display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);}
.cf-cl-card-foot{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border);}
.cf-cl-wa{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:11.5px;font-weight:600;color:#1ebe5a;text-decoration:none;}
.cf-cl-ic-btn{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-cl-ic-btn.danger{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 25%,transparent);}

.cf-meter{width:100%;}
.cf-meter-track{position:relative;height:6px;background:var(--track);border-radius:4px;overflow:visible;}
.cf-meter-fill{height:100%;border-radius:4px;transition:width .5s;}
.cf-meter-fill.ok{background:var(--ok);}
.cf-meter-fill.warn{background:var(--warn);}
.cf-meter-fill.crit{background:var(--crit);}

.cf-cl-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-cl-thead{display:grid;grid-template-columns:2.2fr 90px 1fr 1.4fr 1fr 130px;gap:12px;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-cl-th{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-cl-th.r{text-align:right;}
.cf-cl-row{display:grid;grid-template-columns:2.2fr 90px 1fr 1.4fr 1fr 130px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;}
.cf-cl-row:last-child{border-bottom:none;}
.cf-cl-row:hover{background:var(--surface-2);}
.cf-cl-r-name{display:flex;align-items:center;gap:10px;min-width:0;}
.cf-cl-r-nm{font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-cl-r-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-cl-cell.r{text-align:right;}
.cf-cl-r-num{font-family:var(--font-mono);font-weight:700;}
.cf-cl-r-num.muted{color:var(--text-muted);}
.cf-cl-r-num.crit{color:var(--crit);}
.cf-cl-r-num.warn{color:var(--warn);}
.cf-cl-r-health{display:flex;flex-direction:column;gap:5px;min-width:90px;}
.cf-cl-r-health-l{font-size:11px;font-family:var(--font-mono);}
.cf-cl-r-actions{display:flex;gap:5px;justify-content:flex-end;}
.cf-cl-empty{padding:60px 20px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px;}
.cf-cl-empty-ic{width:44px;height:44px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);}
@media(max-width:1000px){.cf-cl-thead,.cf-cl-row{grid-template-columns:2fr 1fr 110px;}.cf-cl-th:nth-child(2),.cf-cl-th:nth-child(3),.cf-cl-row>:nth-child(2),.cf-cl-row>:nth-child(3){display:none;}}

/* painel central via Portal */
.cf-cl-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:cfcFade .2s ease both;}
@keyframes cfcFade{from{opacity:0}to{opacity:1}}
.cf-cl-panel{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-cl-panel-hd{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.cf-cl-panel-id{display:flex;gap:13px;align-items:flex-start;min-width:0;}
.cf-cl-panel-id .cf-cl-avatar{width:48px;height:48px;font-size:18px;}
.cf-cl-panel-title{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.25;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cf-cl-panel-sub{font-size:11.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.cf-cl-panel-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:20px;}
.cf-cl-panel-body::-webkit-scrollbar{width:5px;}
.cf-cl-panel-body::-webkit-scrollbar-thumb{background:var(--track);border-radius:3px;}
.cf-cl-sec-t{font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:11px;display:flex;align-items:center;justify-content:space-between;}
.cf-cl-sec-t .muted{font-weight:500;text-transform:none;letter-spacing:0;}
.cf-cl-contact{display:flex;flex-direction:column;gap:9px;}
.cf-cl-contact-row{display:flex;align-items:center;gap:10px;}
.cf-cl-contact-ic{width:28px;height:28px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;}
.cf-cl-contact-info{flex:1;min-width:0;}
.cf-cl-contact-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);}
.cf-cl-contact-v{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-cl-copy{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-cl-copy:hover{color:var(--brand);}
.cf-cl-finance{display:flex;flex-direction:column;gap:10px;}
.cf-cl-fin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.cf-cl-fin-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:3px;}
.cf-cl-fin-v{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.cf-cl-fin-v.ok{color:var(--ok);}
.cf-cl-fin-v.warn{color:var(--warn);}
.cf-cl-fin-v.crit{color:var(--crit);}
.cf-cl-fin-meter-l{display:flex;justify-content:space-between;font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-cl-venda{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 13px;margin-bottom:8px;}
.cf-cl-venda.canc{opacity:.55;}
.cf-cl-venda-top{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.cf-cl-venda-desc{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--text-dim);}
.cf-cl-venda-total{font-size:14px;font-weight:800;font-family:var(--font-mono);}
.cf-cl-venda-meta{display:flex;gap:6px;font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);margin-top:5px;}
.cf-cl-venda-foot{margin-top:9px;padding-top:9px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;}
.cf-cl-gerenciar{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--brand);font-size:11.5px;font-weight:700;cursor:pointer;padding:0;}
.cf-cl-confirm-x{font-size:13px;color:var(--text-dim);line-height:1.5;}
.cf-cl-panel-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0;}

/* modais */
.cf-cl-mback{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:210;display:flex;align-items:center;justify-content:center;padding:20px;animation:cfcFade .2s ease both;}
.cf-cl-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-cl-mhd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cf-cl-mtitle{font-size:15px;font-weight:800;}
.cf-cl-msub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-cl-mbody{padding:18px 22px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;}
.cf-cl-mfoot{padding:13px 22px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}
.cf-cl-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-cl-form-sec{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand);font-family:var(--font-mono);margin-top:4px;}
.cf-cl-form-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.cf-cl-field{display:flex;flex-direction:column;gap:5px;}
.cf-cl-field.full{grid-column:1/-1;}
.cf-cl-label{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-cl-input,.cf-cl-fselect,.cf-cl-textarea{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .18s;}
.cf-cl-input:focus,.cf-cl-fselect:focus,.cf-cl-textarea:focus{border-color:var(--brand-line);}
.cf-cl-textarea{min-height:70px;resize:vertical;font-family:var(--font-ui);}
.cf-cl-divider{border:none;border-top:1px solid var(--border);margin:4px 0;}
.cf-cl-confirm{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:380px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-cl-confirm-t{font-size:15px;font-weight:800;}
.cf-cl-confirm-acts{display:flex;gap:9px;}
.cf-cl-confirm-acts .cf-btn{flex:1;justifyContent:center;}

.cf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:cfcFade .3s ease both;white-space:nowrap;}
.cf-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.cf-toast-ic.warn{background:color-mix(in oklab,var(--warn) 14%,transparent);color:var(--warn);}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}

.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfcSh 1.5s infinite;border-radius:8px;}
@keyframes cfcSh{from{background-position:200% 0}to{background-position:-200% 0}}

@media(max-width:1100px){.cf-cl-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-cl-kpis{grid-template-columns:1fr;}.cf-cl-form-row{grid-template-columns:1fr;}}
`;

/* ── Portal ───────────────────────────────────────────────────────────── */
function Portal({children, theme}) {
  useEffect(()=>{ const p=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=p; }; },[]);
  return createPortal(<div className="cf-cli-portal" data-theme={theme}>{children}</div>, document.body);
}

/* ── Painel de detalhe (MODAL CENTRAL via Portal) — somente leitura de vendas ── */
function ClientePanel({ cli, detalhe, loadingDetalhe, onClose, onEdit, onDelete, onToast, theme }) {
  if (!cli) return null;
  const navigate = useNavigate();
  const ap = ALERTA_PILL[cli.alerta];
  const copiar = (t, label) => { navigator.clipboard && navigator.clipboard.writeText(t); onToast(`${label} copiado`); };
  const d = detalhe || {};
  const vendas = d.vendas || [];

  return (
    <Portal theme={theme}>
      <div className="cf-cl-ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="cf-cl-panel">
          <div className="cf-cl-panel-hd">
            <div className="cf-cl-panel-id">
              <div className="cf-cl-avatar" style={{ '--av': avatarColor(cli.nome) }}>{inicial(cli.nome)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="cf-cl-panel-title">{cli.nome}</div>
                <div className="cf-cl-panel-sub">cliente desde {cli.criado_em || '—'} · {cli.total_vendas} compra(s)</div>
                {ap && <div style={{ marginTop: 9 }}><span className={`cf-pill ${ap.cls}`}>{ap.label} · {fmtBRLc(cli.total_em_aberto)}</span></div>}
              </div>
            </div>
            <button className="cf-mclose" onClick={onClose}><Ic d={ICONS.x} size={14}/></button>
          </div>

          <div className="cf-cl-panel-body">
            <section>
              <div className="cf-cl-sec-t">Contato</div>
              <div className="cf-cl-contact">
                <div className="cf-cl-contact-row">
                  <span className="cf-cl-contact-ic"><Ic d={ICONS.phone} size={14}/></span>
                  <div className="cf-cl-contact-info"><div className="cf-cl-contact-l">Telefone / WhatsApp</div><div className="cf-cl-contact-v">{fmtTelc(cli.telefone)}</div></div>
                  {cli.telefone && <button className="cf-cl-copy" onClick={() => copiar(fmtTelc(cli.telefone), 'Telefone')} title="Copiar"><Ic d={ICONS.copy} size={14}/></button>}
                </div>
                <div className="cf-cl-contact-row">
                  <span className="cf-cl-contact-ic"><Ic d={ICONS.mail} size={14}/></span>
                  <div className="cf-cl-contact-info"><div className="cf-cl-contact-l">E-mail</div><div className="cf-cl-contact-v">{cli.email || '—'}</div></div>
                  {cli.email && <button className="cf-cl-copy" onClick={() => copiar(cli.email, 'E-mail')} title="Copiar"><Ic d={ICONS.copy} size={14}/></button>}
                </div>
                <div className="cf-cl-contact-row">
                  <span className="cf-cl-contact-ic"><Ic d={ICONS.pin} size={14}/></span>
                  <div className="cf-cl-contact-info"><div className="cf-cl-contact-l">Localização</div><div className="cf-cl-contact-v">{[cli.endereco, cli.cidade].filter(Boolean).join(' · ') || '—'}</div></div>
                </div>
                <div className="cf-cl-contact-row">
                  <span className="cf-cl-contact-ic"><Ic d={ICONS.users} size={14}/></span>
                  <div className="cf-cl-contact-info"><div className="cf-cl-contact-l">CPF</div><div className="cf-cl-contact-v" style={{ fontFamily: 'var(--font-mono)' }}>{cli.cpf || '—'}</div></div>
                </div>
              </div>
            </section>

            <section>
              <div className="cf-cl-sec-t">Resumo financeiro</div>
              <div className="cf-cl-finance">
                <div className="cf-cl-fin-grid">
                  <div><div className="cf-cl-fin-l">Comprou</div><div className="cf-cl-fin-v">{fmtBRLc(cli.total_gasto, 0)}</div></div>
                  <div><div className="cf-cl-fin-l">Pago</div><div className="cf-cl-fin-v ok">{fmtBRLc(cli.total_recebido, 0)}</div></div>
                  <div><div className="cf-cl-fin-l">Em aberto</div><div className={`cf-cl-fin-v ${cli.alerta === 'vencido' ? 'crit' : cli.total_em_aberto > 0 ? 'warn' : 'ok'}`}>{cli.total_em_aberto > 0 ? fmtBRLc(cli.total_em_aberto, 0) : '—'}</div></div>
                </div>
                <div className="cf-meter"><div className="cf-meter-track"><div className={`cf-meter-fill ${cli.alerta === 'vencido' ? 'crit' : cli.total_em_aberto > 0 ? 'warn' : 'ok'}`} style={{ width: (cli.quitado_pct||100) + '%' }} /></div></div>
                <div className="cf-cl-fin-meter-l"><span>{cli.quitado_pct||100}% quitado</span>{cli.parcelas_vencidas > 0 && <span style={{ color: 'var(--crit)' }}>⚠ {cli.parcelas_vencidas} parcela(s) vencida(s)</span>}</div>
              </div>
            </section>

            {cli.total_em_aberto > 0 && (
              <a className="cf-btn cf-btn-wa" style={{ justifyContent: 'center' }} href={waLink(cli)} target="_blank" rel="noreferrer">
                <Ic d={ICONS.wa} size={15}/> Cobrar {fmtBRLc(cli.total_em_aberto, 0)} no WhatsApp
              </a>
            )}

            <section>
              <div className="cf-cl-sec-t">Histórico de compras <span className="muted">{vendas.length} venda(s)</span></div>
              {loadingDetalhe ? (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2].map(i=><div key={i} className="cf-skel" style={{height:60}}/>)}</div>
              ) : vendas.length===0 ? (
                <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>Nenhuma venda registrada</div>
              ) : vendas.map(v => {
                const canc = v.status_pagamento === 'cancelado';
                const pend = !canc && (v.status_pagamento === 'em_aberto' || v.status_pagamento === 'vencido');
                return (
                  <div key={v.id} className={`cf-cl-venda${canc ? ' canc' : ''}`}>
                    <div className="cf-cl-venda-top">
                      <div className="cf-cl-venda-desc">#{v.id} <VPill v={v} /></div>
                      <div className="cf-cl-venda-total">{fmtBRLc(v.valor_total)}</div>
                    </div>
                    <div className="cf-cl-venda-meta">
                      <span>{v.data_venda}</span><span>·</span><span>{txt(v.modo_pagamento)||'—'}</span><span>·</span><span>{v.num_itens} {v.num_itens===1?'item':'itens'}</span>
                    </div>
                    {(pend || v.pedido_id) && (
                      <div className="cf-cl-venda-foot">
                        {v.pedido_id ? (
                          <button className="cf-cl-gerenciar" onClick={()=>navigate(`/vendas?abrir=${v.pedido_id}`)}>
                            Gerenciar em Vendas →
                          </button>
                        ) : (
                          <span style={{fontSize:10.5,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>sem pedido vinculado</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {cli.observacao && (
              <section>
                <div className="cf-cl-sec-t">Observações</div>
                <div className="cf-cl-confirm-x" style={{ margin: 0 }}>{cli.observacao}</div>
              </section>
            )}
          </div>

          <div className="cf-cl-panel-foot">
            <button className="cf-btn cf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(cli)}><Ic d={ICONS.edit} size={14}/> Editar</button>
            <button className="cf-btn cf-btn-danger" onClick={() => onDelete(cli)}><Ic d={ICONS.trash} size={14}/></button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Clientes() {
  const [theme, setTheme] = useState(getDocTheme);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [ordem, setOrdem] = useState('nome');
  const [view, setView] = useState('grade');
  const [sel, setSel] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(CLI_EMPTY);
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
      const data = await api.get('/clientes');
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar os clientes.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadDetalhe = useCallback(async (id) => {
    setLoadingDet(true);
    try { const d = await api.get(`/clientes/${id}`); setDetalhe(d); }
    catch (e) { showToast(e.message, 'err'); }
    finally { setLoadingDet(false); }
  }, []);
  useEffect(() => { if (sel) loadDetalhe(sel.id); else setDetalhe(null); }, [sel, loadDetalhe]);

  const counts = useMemo(() => ({
    todos: clientes.length,
    aberto: clientes.filter(c => c.total_em_aberto > 0).length,
    vencido: clientes.filter(c => c.alerta === 'vencido').length,
    emdia: clientes.filter(c => c.total_em_aberto === 0).length,
  }), [clientes]);

  const kpis = useMemo(() => ({
    total: clientes.length,
    receber: clientes.reduce((a, c) => a + c.total_em_aberto, 0),
    nReceber: clientes.filter(c => c.total_em_aberto > 0).length,
    faturado: clientes.reduce((a, c) => a + c.total_gasto, 0),
    vencido: clientes.filter(c => c.alerta === 'vencido').reduce((a, c) => a + c.total_em_aberto, 0),
    nVencido: counts.vencido,
  }), [clientes, counts]);

  const lista = useMemo(() => {
    let r = clientes.filter(c => {
      if (filtro === 'aberto' && c.total_em_aberto <= 0) return false;
      if (filtro === 'vencido' && c.alerta !== 'vencido') return false;
      if (filtro === 'emdia' && c.total_em_aberto > 0) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(c.nome.toLowerCase().includes(q) || (c.telefone || '').includes(q) || (c.cidade || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const cmp = {
      nome: (a, b) => a.nome.localeCompare(b.nome),
      saldo: (a, b) => b.total_em_aberto - a.total_em_aberto,
      vencido: (a, b) => (b.parcelas_vencidas - a.parcelas_vencidas) || (b.total_em_aberto - a.total_em_aberto),
      compras: (a, b) => b.total_gasto - a.total_gasto,
    }[ordem];
    return [...r].sort(cmp);
  }, [clientes, filtro, busca, ordem]);

  const openNovo = () => { setForm(CLI_EMPTY); setFormErr(''); setModal('novo'); };
  const openEdit = (c) => {
    setForm({ nome: c.nome, telefone: c.telefone || '', email: c.email || '', cpf: c.cpf || '',
      cidade: c.cidade || '', endereco: c.endereco || '', cep: c.cep || '', observacao: c.observacao || '' });
    setFormErr(''); setModal({ editId: c.id });
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setFormErr('O nome é obrigatório.'); return; }
    setSalvando(true); setFormErr('');
    try {
      const payload = { nome: form.nome.trim(), telefone: form.telefone.trim()||null, email: form.email.trim()||null,
        cpf: form.cpf.trim()||null, endereco: form.endereco.trim()||null, cidade: form.cidade.trim()||null,
        cep: form.cep.trim()||null, observacao: form.observacao.trim()||null };
      if (modal.editId) {
        await api.put(`/clientes/${modal.editId}`, payload);
        showToast('Cliente atualizado');
      } else {
        await api.post('/clientes', payload);
        showToast('Cliente cadastrado');
      }
      setModal(null);
      await load();
      if (sel && modal.editId === sel.id) await loadDetalhe(sel.id);
    } catch (e) {
      setFormErr(e.message || 'Erro ao salvar cliente.');
    } finally { setSalvando(false); }
  };

  const remover = async (c) => {
    try {
      await api.del(`/clientes/${c.id}`);
      setConfirmDel(null); setSel(null);
      showToast('Cliente removido', 'err');
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao remover cliente', 'err');
    }
  };

  const CHIPS = [
    { k: 'todos', label: 'Todos', dot: null },
    { k: 'aberto', label: 'Com saldo', dot: 'var(--warn)' },
    { k: 'vencido', label: 'Vencidos', dot: 'var(--crit)' },
    { k: 'emdia', label: 'Em dia', dot: 'var(--ok)' },
  ];
  const ORD_LABEL = { nome: 'Nome (A–Z)', saldo: 'Maior saldo', vencido: 'Mais vencidos', compras: 'Mais compraram' };

  const KPIS = [
    { tone: 't-brand', ic: 'users', val: kpis.total, lbl: 'Clientes ativos', sub: `${kpis.total} cadastrados` },
    { tone: 't-warn', ic: 'spark', val: fmtBRLc(kpis.receber, 0), lbl: 'A receber (fiado)', sub: `${kpis.nReceber} cliente(s) com saldo`, hero: kpis.receber > 0, cta: kpis.receber > 0 ? 'Ver pendências' : null, ctaTo: 'aberto' },
    { tone: 't-ok', ic: 'spark', val: fmtBRLc(kpis.faturado, 0), lbl: 'Total já comprado', sub: 'soma do histórico ativo' },
    { tone: 't-crit', ic: 'spark', val: fmtBRLc(kpis.vencido, 0), lbl: 'Vencido', sub: kpis.nVencido ? `${kpis.nVencido} cliente(s) atrasado(s)` : 'tudo em dia', cta: kpis.nVencido ? 'Cobrar agora' : null, ctaTo: 'vencido' },
  ];

  return (
    <div className="cf-cli-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-cl">

        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800}}>Clientes</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)',marginTop:4}}>{clientes.length} clientes cadastrados</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={openNovo}><Ic d={ICONS.plus} size={15}/> Novo cliente</button>
        </div>

        {erro && <div className="cf-cl-err">⚠ {erro}</div>}

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
        ) : (
          <>
            {counts.vencido > 0 && (
              <div className="cf-cl-alert">
                <span className="cf-att-pulse" />
                <span className="cf-cl-alert-txt"><strong>{counts.vencido} cliente(s) com pagamento vencido</strong> somando {fmtBRLc(kpis.vencido)} — combine a cobrança pelo WhatsApp.</span>
                <button className="cf-btn cf-btn-ghost sm" onClick={() => setFiltro('vencido')}>Ver vencidos</button>
              </div>
            )}

            <div className="cf-cl-kpis">
              {KPIS.map(k => (
                <div key={k.lbl} className={`cf-cl-kpi ${k.tone}${k.hero ? ' hero' : ''}`}>
                  <div className="cf-cl-kpi-top"><span className="cf-cl-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
                  <div className="cf-cl-kpi-val">{k.val}</div>
                  <div><div className="cf-cl-kpi-lbl">{k.lbl}</div><div className="cf-cl-kpi-sub">{k.sub}</div></div>
                  {k.cta && <button className="cf-cl-kpi-cta" onClick={() => setFiltro(k.ctaTo)}>{k.cta} →</button>}
                </div>
              ))}
            </div>

            <div className="cf-cl-toolbar">
              <div className="cf-cl-srch">
                <Ic d={ICONS.users} size={15} />
                <input placeholder="Buscar nome, telefone ou cidade…" value={busca} onChange={e => setBusca(e.target.value)} />
                {busca && <button className="x" onClick={() => setBusca('')}>×</button>}
              </div>
              <div className="cf-cl-chips">
                {CHIPS.map(c => (
                  <button key={c.k} className={`cf-cl-chip${filtro === c.k ? ' on' : ''}`} onClick={() => setFiltro(c.k)}>
                    {c.dot && <span className="cf-cl-chip-dot" style={{ background: c.dot }} />}{c.label}<span className="cf-cl-chip-n">{counts[c.k]}</span>
                  </button>
                ))}
              </div>
              <div className="cf-cl-tools-right">
                <div className="cf-cl-select">
                  <Ic d={ICONS.sort} size={14} />
                  <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                    {Object.entries(ORD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="cf-cl-seg">
                  <button className={view === 'grade' ? 'on' : ''} onClick={() => setView('grade')} title="Grade"><Ic d={ICONS.grid} size={15}/></button>
                  <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')} title="Lista"><Ic d={ICONS.list} size={15}/></button>
                </div>
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="cf-cl-table"><div className="cf-cl-empty"><div className="cf-cl-empty-ic"><Ic d={ICONS.users} size={20}/></div><div>Nenhum cliente neste filtro</div></div></div>
            ) : view === 'grade' ? (
              <div className="cf-cl-grid">
                {lista.map(c => {
                  const ap = ALERTA_PILL[c.alerta];
                  return (
                    <div key={c.id} className={`cf-cl-card${c.alerta ? ' al-' + c.alerta : ''}`} onClick={() => setSel(c)}>
                      <div className="cf-cl-card-top">
                        <div className="cf-cl-avatar" style={{ '--av': avatarColor(c.nome) }}>{inicial(c.nome)}</div>
                        <div className="cf-cl-card-id">
                          <div className="cf-cl-card-nmrow"><span className="cf-cl-card-name">{c.nome}</span></div>
                          <div className="cf-cl-card-tel">{fmtTelc(c.telefone)}</div>
                          {c.cidade && <div className="cf-cl-card-loc">{c.cidade}</div>}
                        </div>
                      </div>
                      <div className="cf-cl-card-mid">
                        <div><div className="cf-cl-fld-l">Compras</div><div className="cf-cl-fld-v">{c.total_vendas}</div></div>
                        <div><div className="cf-cl-fld-l">Comprou</div><div className="cf-cl-fld-v muted">{fmtBRLc(c.total_gasto, 0)}</div></div>
                        <div><div className="cf-cl-fld-l">Em aberto</div><div className={`cf-cl-fld-v ${c.alerta === 'vencido' ? 'crit' : c.total_em_aberto > 0 ? 'warn' : 'ok'}`}>{c.total_em_aberto > 0 ? fmtBRLc(c.total_em_aberto, 0) : '—'}</div></div>
                      </div>
                      <div className="cf-cl-card-health">
                        <div className="cf-cl-health-top"><span><strong>{c.quitado_pct}%</strong> quitado</span>{c.parcelas_vencidas > 0 && <span style={{ color: 'var(--crit)' }}>{c.parcelas_vencidas} vencida(s)</span>}</div>
                        <div className="cf-meter"><div className="cf-meter-track"><div className={`cf-meter-fill ${c.alerta === 'vencido' ? 'crit' : c.total_em_aberto > 0 ? 'warn' : 'ok'}`} style={{ width: c.quitado_pct + '%' }} /></div></div>
                      </div>
                      <div className="cf-cl-card-foot" onClick={e => e.stopPropagation()}>
                        {ap ? <span className={`cf-pill ${ap.cls}`}>{ap.label}</span> : <span className="cf-pill ok">Em dia</span>}
                        {c.telefone && <a className="cf-cl-wa" href={waLink(c)} target="_blank" rel="noreferrer" title="Abrir no WhatsApp"><Ic d={ICONS.wa} size={14}/> WhatsApp</a>}
                        <button className="cf-cl-ic-btn" onClick={() => openEdit(c)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cf-cl-table">
                <div className="cf-cl-thead">
                  <div className="cf-cl-th">Cliente</div>
                  <div className="cf-cl-th r">Compras</div>
                  <div className="cf-cl-th r">Comprou</div>
                  <div className="cf-cl-th">Saúde / saldo</div>
                  <div className="cf-cl-th">Status</div>
                  <div className="cf-cl-th r">Ações</div>
                </div>
                {lista.map(c => {
                  const ap = ALERTA_PILL[c.alerta];
                  return (
                    <div key={c.id} className="cf-cl-row" onClick={() => setSel(c)}>
                      <div className="cf-cl-r-name">
                        <div className="cf-cl-avatar" style={{ '--av': avatarColor(c.nome) }}>{inicial(c.nome)}</div>
                        <div>
                          <div className="cf-cl-r-nm">{c.nome}</div>
                          <div className="cf-cl-r-sub">{fmtTelc(c.telefone)}{c.cidade ? ' · ' + c.cidade : ''}</div>
                        </div>
                      </div>
                      <div className="cf-cl-cell r"><span className="cf-cl-r-num">{c.total_vendas}</span></div>
                      <div className="cf-cl-cell r"><span className="cf-cl-r-num muted">{fmtBRLc(c.total_gasto, 0)}</span></div>
                      <div className="cf-cl-cell">
                        <div className="cf-cl-r-health">
                          <div className="cf-cl-r-health-l">{c.total_em_aberto > 0 ? <span className={c.alerta === 'vencido' ? 'cf-cl-r-num crit' : 'cf-cl-r-num warn'} style={{ fontSize: 11.5 }}>{fmtBRLc(c.total_em_aberto, 0)} aberto</span> : <span style={{ color: 'var(--text-muted)' }}>{c.quitado_pct}% quitado</span>}</div>
                          <div className="cf-meter"><div className="cf-meter-track"><div className={`cf-meter-fill ${c.alerta === 'vencido' ? 'crit' : c.total_em_aberto > 0 ? 'warn' : 'ok'}`} style={{ width: c.quitado_pct + '%' }} /></div></div>
                        </div>
                      </div>
                      <div className="cf-cl-cell">{ap ? <span className={`cf-pill ${ap.cls}`}>{ap.label}</span> : <span className="cf-pill ok">Em dia</span>}</div>
                      <div className="cf-cl-cell r" onClick={e => e.stopPropagation()}>
                        <div className="cf-cl-r-actions">
                          {c.telefone && <a className="cf-cl-ic-btn" href={waLink(c)} target="_blank" rel="noreferrer" title="WhatsApp" style={{ color: '#1ebe5a' }}><Ic d={ICONS.wa} size={14}/></a>}
                          <button className="cf-cl-ic-btn" onClick={() => openEdit(c)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
                          <button className="cf-cl-ic-btn danger" onClick={() => setConfirmDel(c)} title="Remover"><Ic d={ICONS.trash} size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {sel && (
        <ClientePanel cli={clientes.find(c => c.id === sel.id) || sel} detalhe={detalhe} loadingDetalhe={loadingDet}
          onClose={() => setSel(null)} onEdit={openEdit} onDelete={setConfirmDel} onToast={showToast} theme={theme} />
      )}

      {modal && (
        <Portal theme={theme}>
          <div className="cf-cl-mback" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="cf-cl-modal">
              <div className="cf-cl-mhd">
                <div><div className="cf-cl-mtitle">{modal.editId ? 'Editar cliente' : 'Novo cliente'}</div><div className="cf-cl-msub">{modal.editId ? 'Atualize os dados' : 'Cadastre um novo cliente'}</div></div>
                <button className="cf-mclose" onClick={() => setModal(null)}><Ic d={ICONS.x} size={14}/></button>
              </div>
              <div className="cf-cl-mbody">
                {formErr && <div className="cf-cl-err">⚠ {formErr}</div>}
                <div className="cf-cl-form-sec">Dados pessoais</div>
                <div className="cf-cl-field full"><label className="cf-cl-label">Nome completo *</label><input className="cf-cl-input" placeholder="Ex: Maria Silva" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                <div className="cf-cl-form-row">
                  <div className="cf-cl-field"><label className="cf-cl-label">Telefone / WhatsApp</label><input className="cf-cl-input" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
                  <div className="cf-cl-field"><label className="cf-cl-label">CPF</label><input className="cf-cl-input" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} /></div>
                </div>
                <div className="cf-cl-field full"><label className="cf-cl-label">E-mail</label><input className="cf-cl-input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <hr className="cf-cl-divider" />
                <div className="cf-cl-form-sec">Endereço</div>
                <div className="cf-cl-form-row">
                  <div className="cf-cl-field"><label className="cf-cl-label">Endereço</label><input className="cf-cl-input" placeholder="Rua, número" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} /></div>
                  <div className="cf-cl-field"><label className="cf-cl-label">Cidade</label><input className="cf-cl-input" placeholder="São Paulo, SP" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
                </div>
                <div className="cf-cl-field full"><label className="cf-cl-label">CEP</label><input className="cf-cl-input" placeholder="00000-000" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} /></div>
                <div className="cf-cl-field full"><label className="cf-cl-label">Observações</label><textarea className="cf-cl-textarea" placeholder="Preferências, histórico, anotações…" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} /></div>
              </div>
              <div className="cf-cl-mfoot">
                <button className="cf-btn cf-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : (modal.editId ? 'Salvar' : 'Cadastrar')}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {confirmDel && (
        <Portal theme={theme}>
          <div className="cf-cl-mback" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
            <div className="cf-cl-confirm">
              <div className="cf-cl-confirm-t">Remover cliente?</div>
              <div className="cf-cl-confirm-x">Tem certeza que deseja remover <strong>{confirmDel.nome}</strong>? O histórico de vendas será preservado.</div>
              <div className="cf-cl-confirm-acts">
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