import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  patch:(url,b) => fetch(BASE+url,{method:'PATCH',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:  url     => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = (v, dec=2) => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const PAGAMENTOS = ['Dinheiro','Cartão de crédito','Cartão de débito','PIX','Boleto','Fiado','Transferência'];
const avatarColor = () => null;
const inicial = nome => String(nome||'?').trim()[0]?.toUpperCase() || '?';
const txt = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return v.nome || v.produto || v.label || JSON.stringify(v);
  return v;
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-vd-root *,.cf-vd-root *::before,.cf-vd-root *::after{box-sizing:border-box;}
.cf-vd-root{
  --font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;
  --brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--kpi-pad:18px;
  --ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;
  font-family:var(--font-ui);padding:24px;animation:vdIn .3s ease both;
}
@keyframes vdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-vd-root[data-theme="dark"],.cf-vd-root:not([data-theme]){
  --bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;
  --border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);
  --track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);
  --text-muted:rgba(237,238,243,.34);--shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 28px rgba(0,0,0,.32);--brand-ink:#fff;
}
.cf-vd-root[data-theme="light"]{
  --bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;
  --border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);
  --track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);
  --text-muted:rgba(27,23,34,.42);--shadow:0 1px 2px rgba(28,20,36,.04),0 10px 30px rgba(28,20,36,.07);--brand-ink:#fff;
}
.cf-vd-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}

.cf-vendas{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}
.cf-vd-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.cf-vd-h-title{font-size:22px;font-weight:800;}
.cf-vd-h-sub{font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px;}
.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cf-btn:hover{border-color:var(--border-strong);}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-btn-danger:hover{background:color-mix(in oklab,var(--crit) 18%,transparent);}
.cf-btn-ok{background:var(--ok);color:#fff;border-color:var(--ok);}
.cf-btn-ok:hover{filter:brightness(1.06);}

.cf-vd-alert{display:flex;align-items:center;gap:12px;padding:13px 18px;background:color-mix(in oklab,var(--crit) 10%,var(--surface));border:1px solid color-mix(in oklab,var(--crit) 32%,transparent);border-radius:var(--radius);}
.cf-att-pulse{width:9px;height:9px;border-radius:50%;background:var(--crit);box-shadow:0 0 0 0 color-mix(in oklab,var(--crit) 50%,transparent);animation:vdPulse 2s infinite;flex-shrink:0;}
@keyframes vdPulse{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--crit) 45%,transparent)}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}
.cf-vd-alert-txt{font-size:13px;font-weight:500;}
.cf-vd-alert-txt strong{color:var(--crit);font-weight:700;}
.cf-vd-alert .cf-btn{margin-left:auto;}

.cf-vd-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-vd-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--kpi-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-vd-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-vd-kpi.t-brand{--tone:var(--brand);}.cf-vd-kpi.t-warn{--tone:var(--warn);}.cf-vd-kpi.t-crit{--tone:var(--crit);}.cf-vd-kpi.t-ok{--tone:var(--ok);}
.cf-vd-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-vd-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone) 15%,transparent);color:var(--tone);}
.cf-vd-kpi-val{font-size:23px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-vd-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-vd-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}

.cf-vd-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.cf-vd-srch{display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:9px 13px;min-width:240px;flex:1;max-width:360px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.cf-vd-srch:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-vd-srch input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.cf-vd-srch input::placeholder{color:var(--text-muted);}
.cf-vd-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-vd-chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;cursor:pointer;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);font-family:var(--font-ui);font-size:12.5px;font-weight:600;transition:all .15s;white-space:nowrap;}
.cf-vd-chip:hover{border-color:var(--border-strong);color:var(--text);}
.cf-vd-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-vd-chip-dot{width:7px;height:7px;border-radius:50%;}
.cf-vd-chip-n{font-family:var(--font-mono);font-size:11px;opacity:.8;padding:0 5px;border-radius:5px;background:color-mix(in oklab,var(--text) 7%,transparent);}
.cf-vd-chip.on .cf-vd-chip-n{background:color-mix(in oklab,var(--brand) 18%,transparent);}

.cf-vd-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-vd-thead,.cf-vd-row{display:grid;grid-template-columns:52px minmax(190px,1.7fr) 0.6fr 0.95fr 0.95fr 1fr 0.8fr 116px;align-items:center;gap:12px;padding:0 18px;}
.cf-vd-thead{height:42px;border-bottom:1px solid var(--border);}
.cf-vd-th{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-vd-th.r,.cf-vd-cell.r{text-align:right;justify-self:end;}
.cf-vd-row{min-height:60px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;}
.cf-vd-row:last-child{border-bottom:none;}
.cf-vd-row:hover{background:color-mix(in oklab,var(--text) 3%,transparent);}
.cf-vd-row.canc{opacity:.5;}
.cf-vd-id{font-family:var(--font-mono);font-size:12px;color:var(--text-muted);}
.cf-vd-cli{display:flex;align-items:center;gap:11px;min-width:0;overflow:hidden;}
.cf-vd-avatar{width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--brand-ink);background:linear-gradient(140deg,color-mix(in oklab,var(--brand) 72%,#7a4df0),var(--brand));}
.cf-vd-avatar.balcao{background:var(--surface-2);color:var(--text-muted);border:1px dashed var(--border-strong);}
.cf-vd-cli-info{flex:1;min-width:0;}
.cf-vd-cli-nome{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-vd-cli-pay{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:1px;}
.cf-vd-itens{font-family:var(--font-mono);font-size:12px;color:var(--text-dim);}
.cf-vd-total{font-family:var(--font-mono);font-size:14px;font-weight:700;}
.cf-vd-total.canc{text-decoration:line-through;color:var(--text-muted);}
.cf-vd-data{font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted);}
.cf-pill{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-pill.info{background:var(--brand-soft);color:var(--brand);}
.cf-pill.muted{background:var(--track);color:var(--text-muted);}
.cf-vd-actions{display:flex;gap:6px;justify-content:flex-end;}
.cf-vd-baixa{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;cursor:pointer;background:color-mix(in oklab,var(--ok) 13%,transparent);border:1px solid color-mix(in oklab,var(--ok) 34%,transparent);color:var(--ok);font-family:var(--font-ui);font-size:11.5px;font-weight:700;white-space:nowrap;transition:all .15s;}
.cf-vd-baixa:hover{background:color-mix(in oklab,var(--ok) 22%,transparent);}
.cf-vd-empty{padding:60px 20px;text-align:center;color:var(--text-muted);}
.cf-vd-empty-ic{width:44px;height:44px;margin:0 auto 14px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);color:var(--text-muted);}
.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:vdSh 1.5s infinite;border-radius:8px;}
@keyframes vdSh{from{background-position:200% 0}to{background-position:-200% 0}}

/* painel lateral */
.cf-vd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:140;backdrop-filter:blur(2px);animation:vdFade .2s ease both;}
@keyframes vdFade{from{opacity:0}to{opacity:1}}
.cf-vd-panel{position:fixed;right:0;top:0;bottom:0;width:420px;max-width:92vw;z-index:150;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;animation:vdSlide .32s cubic-bezier(.22,1,.36,1) both;box-shadow:-20px 0 50px rgba(0,0,0,.25);}
@keyframes vdSlide{from{transform:translateX(100%)}to{transform:none}}
.cf-vd-panel-hd{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.cf-vd-panel-title{font-size:18px;font-weight:800;}
.cf-vd-panel-sub{font-size:11.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.cf-vd-panel-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:20px;}
.cf-vd-sec-t{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:10px;}
.cf-vd-summary{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.cf-vd-sm-l{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-bottom:4px;}
.cf-vd-sm-v{font-size:15px;font-weight:700;}
.cf-vd-sm-v.ok{color:var(--ok);}
.cf-vd-prod-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:7px;}
.cf-vd-prod-nome{font-size:12.5px;font-weight:600;}
.cf-vd-prod-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-vd-prod-val{font-family:var(--font-mono);font-size:12.5px;font-weight:700;white-space:nowrap;}
.cf-vd-toggle{display:flex;gap:8px;}
.cf-vd-toggle button{flex:1;padding:9px;border-radius:9px;border:1px solid var(--border);cursor:pointer;background:var(--surface-2);color:var(--text-dim);font-family:var(--font-ui);font-size:12.5px;font-weight:600;transition:all .15s;}
.cf-vd-toggle button.on-ok{background:color-mix(in oklab,var(--ok) 15%,transparent);border-color:color-mix(in oklab,var(--ok) 38%,transparent);color:var(--ok);}
.cf-vd-toggle button.on-warn{background:color-mix(in oklab,var(--warn) 15%,transparent);border-color:color-mix(in oklab,var(--warn) 38%,transparent);color:var(--warn);}
.cf-vd-note{font-size:12.5px;color:var(--text-dim);background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;line-height:1.45;}
.cf-vd-panel-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;}
.cf-mclose{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.cf-mclose:hover{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 35%,transparent);}

/* toast */
.cf-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;background:var(--elevated);border:1px solid var(--border-strong);border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:11px;font-size:13px;font-weight:500;box-shadow:0 12px 36px rgba(0,0,0,.3);animation:vdToast .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes vdToast{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translate(-50%,0)}}
.cf-toast-ic{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--ok) 16%,transparent);color:var(--ok);}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 16%,transparent);color:var(--crit);}

/* modal nova venda */
.cf-vd-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;animation:vdFade .2s ease both;}
.cf-vd-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:18px;width:100%;max-width:600px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.5);}
.cf-vd-modal-hd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.cf-vd-modal-title{font-size:16px;font-weight:800;}
.cf-vd-modal-body{overflow-y:auto;flex:1;padding:18px 22px;display:flex;flex-direction:column;gap:16px;}
.cf-vd-modal-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;}
.cf-fld{display:flex;flex-direction:column;gap:6px;}
.cf-fld-lbl{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-inp,.cf-sel{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:10px 13px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .2s;}
.cf-inp:focus,.cf-sel:focus{border-color:var(--brand-line);}
.cf-sel{cursor:pointer;}
.cf-fr2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.cf-sectitle{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-toggle-modo{display:flex;gap:6px;background:var(--surface-2);border-radius:10px;padding:4px;}
.cf-toggle-modo button{flex:1;padding:8px;border-radius:7px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;font-family:var(--font-ui);transition:all .2s;background:transparent;color:var(--text-muted);}
.cf-modo-prod.on{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-modo-livre.on{background:color-mix(in oklab,var(--warn) 15%,transparent);color:var(--warn);}
.cf-prod-drop{position:absolute;top:100%;left:0;right:0;background:var(--elevated);border:1px solid var(--border-strong);border-radius:9px;margin-top:4px;z-index:20;max-height:200px;overflow-y:auto;box-shadow:var(--shadow);}
.cf-prod-opt{padding:9px 13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:13px;border-bottom:1px solid var(--border);}
.cf-prod-opt:hover{background:var(--surface-2);}
.cf-item-row{display:flex;align-items:center;gap:9px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 12px;}
.cf-qty-btn{width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}
.cf-totais{background:color-mix(in oklab,var(--brand) 5%,var(--surface-2));border:1px solid var(--brand-line);border-radius:11px;padding:14px 16px;display:flex;flex-direction:column;gap:7px;}
.cf-tot-row{display:flex;justify-content:space-between;font-size:13px;}
.cf-err{font-size:12.5px;color:var(--crit);background:color-mix(in oklab,var(--crit) 9%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:9px;padding:9px 12px;}

@media(max-width:1100px){
  .cf-vd-kpis{grid-template-columns:repeat(2,1fr);}
  .cf-vd-thead{display:none;}
  .cf-vd-row{grid-template-columns:1fr auto;grid-auto-rows:auto;gap:6px 12px;padding:14px 16px;}
  .cf-vd-id{grid-column:1;}.cf-vd-cli{grid-column:1;grid-row:2;}
  .cf-vd-itens,.cf-vd-data,.cf-vd-cell.ent{display:none;}
  .cf-vd-cell.pay{grid-column:2;grid-row:1;}
  .cf-vd-total{grid-column:2;grid-row:2;justify-self:end;}
  .cf-vd-actions{grid-column:1/-1;grid-row:3;justify-content:flex-start;}
}
@media(max-width:560px){.cf-vd-kpis{grid-template-columns:1fr;}.cf-fr2{grid-template-columns:1fr;}}
`;

const Ic = ({ d, size=16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ICONS = {
  cash:    <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>,
  clock:   <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  alert:   <><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></>,
  check:   <polyline points="20 6 9 17 4 12"/>,
  search:  <><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>,
  plus:    <><path d="M12 5v14M5 12h14"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  truck:   <><rect x="2" y="6" width="12" height="9" rx="1"/><path d="M14 9h4l3 3v3h-7Z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></>,
};

const PAG_LABEL = { pago:'Pago', em_aberto:'Em aberto', vencido:'Vencido', cancelado:'Cancelado' };
const PAG_CLS   = { pago:'ok', em_aberto:'warn', vencido:'crit', cancelado:'muted' };
const ENT_LABEL = { entregue:'Entregue', pendente_entrega:'A entregar', cancelado:'Cancelado' };
const ENT_CLS   = { entregue:'ok', pendente_entrega:'info', cancelado:'muted' };

const getDocTheme = () => { try { return document.documentElement.getAttribute('data-theme') || 'dark'; } catch { return 'dark'; } };

export default function Vendas() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [theme, setTheme] = useState(getDocTheme);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos|em_aberto|vencido|pago|cancelado
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  // modal nova venda
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ cliente_id:'', modo_pagamento:'PIX', parcelado:false, num_parcelas:2, data_vencimento:'', desconto_geral:'', observacao:'', valor_entrada:'' });
  const [itens, setItens] = useState([]);
  const [modoLivre, setModoLivre] = useState(false);
  const [valorLivre, setValorLivre] = useState('');
  const [descLivre, setDescLivre] = useState('');
  const [prodBusca, setProdBusca] = useState('');
  const [prodDrop, setProdDrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  const showToast = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null), 3200); };

  useEffect(() => {
    const obs = new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ped,cli,prod] = await Promise.allSettled([
        api.get('/pedidos?limite=200'), api.get('/clientes'), api.get('/produtos')
      ]);
      if (ped.status==='fulfilled')  setPedidos(Array.isArray(ped.value)?ped.value:[]);
      if (cli.status==='fulfilled')  setClientes(Array.isArray(cli.value)?cli.value:[]);
      if (prod.status==='fulfilled') setProdutos(Array.isArray(prod.value)?prod.value:[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // abre modal se vier ?novo=1
  useEffect(() => { if (params.get('novo')==='1') openModal(); /* eslint-disable-next-line */ }, []);

  /* resumo / KPIs */
  const ativas   = pedidos.filter(p => p.status !== 'cancelado');
  const aReceber = ativas.filter(p => p.status_pagamento==='em_aberto' || p.status_pagamento==='vencido');
  const vencidas = ativas.filter(p => p.status_pagamento==='vencido');
  const pagas    = ativas.filter(p => p.status_pagamento==='pago');
  const resumo = {
    faturamento: ativas.reduce((a,p)=>a+p.total,0),
    receber: aReceber.reduce((a,p)=>a+p.total,0),
    recebido: pagas.reduce((a,p)=>a+p.total,0),
    vencido: vencidas.reduce((a,p)=>a+p.total,0),
    n_vencido: vencidas.length, n_total: ativas.length,
  };

  const counts = {
    todos: pedidos.length,
    em_aberto: ativas.filter(p=>p.status_pagamento==='em_aberto').length,
    vencido: vencidas.length,
    pago: pagas.length,
    cancelado: pedidos.filter(p=>p.status==='cancelado').length,
  };

  const lista = useMemo(() => {
    let l = pedidos;
    if (filtro==='cancelado') l = l.filter(p=>p.status==='cancelado');
    else if (filtro!=='todos') l = l.filter(p=>p.status!=='cancelado' && p.status_pagamento===filtro);
    if (search) {
      const q = search.toLowerCase();
      l = l.filter(p => (p.cliente||'').toLowerCase().includes(q) || String(p.id).includes(q));
    }
    return l;
  }, [pedidos, filtro, search]);

  /* modal handlers */
  const openModal = () => {
    setForm({ cliente_id:'', modo_pagamento:'PIX', parcelado:false, num_parcelas:2, data_vencimento:'', desconto_geral:'', observacao:'', valor_entrada:'' });
    setItens([]); setModoLivre(false); setValorLivre(''); setDescLivre(''); setProdBusca(''); setFormErr('');
    setShowModal(true);
  };
  const prodFiltrados = prodBusca.length>=1
    ? produtos.filter(p => p.nome?.toLowerCase().includes(prodBusca.toLowerCase()) || (p.sku||'').toLowerCase().includes(prodBusca.toLowerCase())).slice(0,8)
    : [];
  const addItem = (p) => {
    setItens(prev => {
      const ex = prev.find(i=>i.produto_id===p.id);
      if (ex) return prev.map(i=>i.produto_id===p.id?{...i,quantidade:i.quantidade+1}:i);
      return [...prev,{produto_id:p.id,nome:p.nome,estoque:p.estoque_atual,preco_unitario:p.preco_venda,quantidade:1}];
    });
    setProdBusca(''); setProdDrop(false);
  };
  const updQty = (id,q) => setItens(prev=>prev.map(i=>i.produto_id===id?{...i,quantidade:Math.max(1,q)}:i));
  const delItem = id => setItens(prev=>prev.filter(i=>i.produto_id!==id));

  const subtotal = modoLivre ? (parseFloat(valorLivre)||0) : itens.reduce((a,i)=>a+i.quantidade*i.preco_unitario,0);
  const descG = modoLivre ? 0 : (parseFloat(form.desconto_geral)||0);
  const total = Math.max(0, subtotal - descG);
  const entrada = Math.min(parseFloat(form.valor_entrada)||0, total);
  const restante = Math.max(total - entrada, 0);
  const valParc = form.parcelado && form.num_parcelas>1 && restante>0 ? restante/parseInt(form.num_parcelas) : null;

  const salvar = async () => {
    if (!modoLivre && itens.length===0) { setFormErr('Adicione ao menos 1 produto ou use Valor livre.'); return; }
    if (modoLivre && (!valorLivre||parseFloat(valorLivre)<=0)) { setFormErr('Informe o valor da venda.'); return; }
    const fiado = form.modo_pagamento==='Fiado';
    if (fiado && !form.cliente_id) { setFormErr('Venda fiado exige cliente.'); return; }
    if ((form.parcelado||fiado||form.modo_pagamento==='Boleto') && !form.data_vencimento) { setFormErr('Informe a data de vencimento.'); return; }
    setSaving(true); setFormErr('');
    try {
      const payload = {
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        itens: modoLivre ? [] : itens.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,preco_unitario:i.preco_unitario,desconto_item:0})),
        modo_pagamento: form.modo_pagamento,
        parcelado: form.parcelado,
        num_parcelas: parseInt(form.num_parcelas)||1,
        data_vencimento: form.data_vencimento||null,
        valor_entrada: entrada,
        desconto_geral: descG,
        observacao: form.observacao||null,
        ...(modoLivre && { valor_livre: parseFloat(valorLivre), descricao_livre: descLivre||'Venda avulsa' }),
      };
      const res = await api.post('/vendas/unificada', payload);
      showToast(`Venda #${res.pedido_id||''} registrada · ${fmtBRL(res.total||total)}`);
      setShowModal(false); load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const baixar = async (p, e) => {
    e?.stopPropagation();
    try { await api.patch(`/pedidos/${p.id}/status?status=entregue`, {}); showToast('Entrega registrada'); load(); }
    catch(err){ showToast(err.message,'err'); }
  };
  const alterarEntrega = async (id, st) => {
    try { await api.patch(`/pedidos/${id}/status?status=${st}`, {}); setSelected(s=>s?{...s,status:st}:null); load(); }
    catch(e){ showToast(e.message,'err'); }
  };
  const cancelar = async (id) => {
    try { await api.del(`/pedidos/${id}`); showToast('Venda cancelada','err'); setSelected(null); load(); }
    catch(e){ showToast(e.message,'err'); }
  };

  const Skel = ({h=44}) => <div className="cf-skel" style={{height:h}}/>;

  return (
    <div className="cf-vd-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-vendas">

        {/* Header */}
        <div className="cf-vd-head">
          <div>
            <div className="cf-vd-h-title">Vendas</div>
            <div className="cf-vd-h-sub">{resumo.n_total} venda(s) ativa(s)</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={openModal}>
            <Ic d={ICONS.plus} size={15}/> Nova venda
          </button>
        </div>

        {/* Alerta de vencidos */}
        {resumo.n_vencido > 0 && (
          <div className="cf-vd-alert">
            <span className="cf-att-pulse"/>
            <span className="cf-vd-alert-txt">
              <strong>{resumo.n_vencido} venda(s) vencida(s)</strong> somando {fmtBRL(resumo.vencido)} a receber
            </span>
            <button className="cf-btn cf-btn-danger" onClick={()=>setFiltro('vencido')}>Ver vencidas</button>
          </div>
        )}

        {/* KPIs */}
        <div className="cf-vd-kpis">
          {[
            { cls:'t-brand', ic:'cash',  lbl:'Faturamento ativo', val:fmtBRL(resumo.faturamento,0), sub:`${resumo.n_total} vendas` },
            { cls:'t-warn',  ic:'clock', lbl:'A receber',         val:fmtBRL(resumo.receber,0),     sub:`${aReceber.length} em aberto` },
            { cls:'t-ok',    ic:'check', lbl:'Recebido',          val:fmtBRL(resumo.recebido,0),    sub:`${pagas.length} pagas` },
            { cls:'t-crit',  ic:'alert', lbl:'Vencido',           val:fmtBRL(resumo.vencido,0),     sub:`${resumo.n_vencido} vencida(s)` },
          ].map(k => (
            <div key={k.lbl} className={`cf-vd-kpi ${k.cls}`}>
              <div className="cf-vd-kpi-top">
                <span className="cf-vd-kpi-ic"><Ic d={ICONS[k.ic]}/></span>
              </div>
              <div className="cf-vd-kpi-val">{loading ? <span className="cf-skel" style={{display:'inline-block',width:90,height:22,borderRadius:6}}/> : k.val}</div>
              <div><div className="cf-vd-kpi-lbl">{k.lbl}</div><div className="cf-vd-kpi-sub">{k.sub}</div></div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="cf-vd-toolbar">
          <div className="cf-vd-srch">
            <Ic d={ICONS.search} size={15}/>
            <input placeholder="Buscar cliente ou nº da venda…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="cf-vd-chips">
            {[
              { k:'todos',     label:'Todas',     dot:null },
              { k:'em_aberto', label:'Em aberto', dot:'var(--warn)' },
              { k:'vencido',   label:'Vencidas',  dot:'var(--crit)' },
              { k:'pago',      label:'Pagas',     dot:'var(--ok)' },
              { k:'cancelado', label:'Canceladas',dot:'var(--text-muted)' },
            ].map(c => (
              <button key={c.k} className={`cf-vd-chip${filtro===c.k?' on':''}`} onClick={()=>setFiltro(c.k)}>
                {c.dot && <span className="cf-vd-chip-dot" style={{background:c.dot}}/>}
                {c.label}
                <span className="cf-vd-chip-n">{counts[c.k]??0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="cf-vd-table">
          <div className="cf-vd-thead">
            <div className="cf-vd-th">#</div>
            <div className="cf-vd-th">Cliente</div>
            <div className="cf-vd-th">Itens</div>
            <div className="cf-vd-th">Pagamento</div>
            <div className="cf-vd-th">Entrega</div>
            <div className="cf-vd-th">Data</div>
            <div className="cf-vd-th r">Total</div>
            <div className="cf-vd-th r">Ações</div>
          </div>

          {loading ? (
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4,5].map(i=><Skel key={i}/>)}</div>
          ) : lista.length===0 ? (
            <div className="cf-vd-empty">
              <div className="cf-vd-empty-ic"><Ic d={ICONS.cash} size={20}/></div>
              {search||filtro!=='todos' ? 'Nenhuma venda encontrada com esse filtro' : 'Nenhuma venda registrada ainda'}
            </div>
          ) : lista.map(p => {
            const canc = p.status==='cancelado';
            const sp = canc ? 'cancelado' : (p.status_pagamento||'pago');
            const podeEntregar = !canc && p.status==='pendente_entrega';
            return (
              <div key={p.id} className={`cf-vd-row${canc?' canc':''}`} onClick={()=>setSelected(p)}>
                <div className="cf-vd-id">#{p.id}</div>
                <div className="cf-vd-cli">
                  <div className={`cf-vd-avatar${!p.cliente||p.cliente==='Balcão'?' balcao':''}`}>
                    {!p.cliente||p.cliente==='Balcão' ? '—' : inicial(p.cliente)}
                  </div>
                  <div className="cf-vd-cli-info">
                    <div className="cf-vd-cli-nome">{txt(p.cliente)||'Balcão'}</div>
                    <div className="cf-vd-cli-pay">{txt(p.modo_pagamento)||'—'}</div>
                  </div>
                </div>
                <div className="cf-vd-itens">{p.num_itens ?? (p.itens?.length||0)} item(s)</div>
                <div className="cf-vd-cell pay"><span className={`cf-pill ${PAG_CLS[sp]||'muted'}`}>{PAG_LABEL[sp]||sp}</span></div>
                <div className="cf-vd-cell ent"><span className={`cf-pill ${ENT_CLS[p.status]||'muted'}`}>{ENT_LABEL[p.status]||p.status}</span></div>
                <div className="cf-vd-data">{txt(p.data)||''}</div>
                <div className={`cf-vd-total r${canc?' canc':''}`}>{fmtBRL(p.total)}</div>
                <div className="cf-vd-actions" onClick={e=>e.stopPropagation()}>
                  {podeEntregar
                    ? <button className="cf-vd-baixa" onClick={e=>baixar(p,e)}><Ic d={ICONS.truck} size={13}/> Entregar</button>
                    : <button className="cf-mclose" style={{width:30,height:30,fontSize:13}} onClick={()=>setSelected(p)} title="Detalhes">›</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel lateral de detalhe */}
      {selected && (() => {
        const p = selected;
        const canc = p.status==='cancelado';
        const sp = canc ? 'cancelado' : (p.status_pagamento||'pago');
        return (
          <>
            <div className="cf-vd-overlay" onClick={()=>setSelected(null)}/>
            <div className="cf-vd-panel">
              <div className="cf-vd-panel-hd">
                <div>
                  <div className="cf-vd-panel-title">Venda #{p.id}</div>
                  <div className="cf-vd-panel-sub">{txt(p.data)} · {txt(p.cliente)||'Balcão'}</div>
                </div>
                <button className="cf-mclose" onClick={()=>setSelected(null)}>×</button>
              </div>

              <div className="cf-vd-panel-body">
                <div>
                  <div className="cf-vd-sec-t">Resumo</div>
                  <div className="cf-vd-summary">
                    <div><div className="cf-vd-sm-l">TOTAL</div><div className="cf-vd-sm-v">{fmtBRL(p.total)}</div></div>
                    <div><div className="cf-vd-sm-l">PAGAMENTO</div><div className="cf-vd-sm-v"><span className={`cf-pill ${PAG_CLS[sp]||'muted'}`}>{PAG_LABEL[sp]||sp}</span></div></div>
                    <div><div className="cf-vd-sm-l">FORMA</div><div className="cf-vd-sm-v" style={{fontSize:13}}>{p.modo_pagamento||'—'}</div></div>
                    <div><div className="cf-vd-sm-l">DESCONTO</div><div className="cf-vd-sm-v" style={{fontSize:13}}>{fmtBRL(p.desconto||0)}</div></div>
                  </div>
                </div>

                {p.itens?.length>0 && (
                  <div>
                    <div className="cf-vd-sec-t">Produtos ({p.itens.length})</div>
                    {p.itens.map((it,idx)=>(
                      <div key={idx} className="cf-vd-prod-row">
                        <div>
                          <div className="cf-vd-prod-nome">{txt(it.produto) || txt(it.nome) || "Item"}</div>
                          <div className="cf-vd-prod-sub">{it.quantidade}× {fmtBRL(it.preco_unitario||0)}</div>
                        </div>
                        <div className="cf-vd-prod-val">{fmtBRL((it.subtotal!=null?it.subtotal:(it.quantidade*(it.preco_unitario||0))))}</div>
                      </div>
                    ))}
                  </div>
                )}

                {!canc && (
                  <div>
                    <div className="cf-vd-sec-t">Status de entrega</div>
                    <div className="cf-vd-toggle">
                      <button className={p.status==='entregue'?'on-ok':''} onClick={()=>alterarEntrega(p.id,'entregue')}>Entregue</button>
                      <button className={p.status==='pendente_entrega'?'on-warn':''} onClick={()=>alterarEntrega(p.id,'pendente_entrega')}>A entregar</button>
                    </div>
                  </div>
                )}

                {p.observacao && (
                  <div>
                    <div className="cf-vd-sec-t">Observação</div>
                    <div className="cf-vd-note">{txt(p.observacao)}</div>
                  </div>
                )}
              </div>

              {!canc && (
                <div className="cf-vd-panel-foot">
                  <button className="cf-btn cf-btn-danger" style={{flex:1,justifyContent:'center'}} onClick={()=>cancelar(p.id)}>
                    <Ic d={ICONS.trash} size={14}/> Cancelar venda
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Modal nova venda */}
      {showModal && (
        <div className="cf-vd-modal-ov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="cf-vd-modal">
            <div className="cf-vd-modal-hd">
              <div className="cf-vd-modal-title">Nova venda</div>
              <button className="cf-mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>

            <div className="cf-vd-modal-body">
              {formErr && <div className="cf-err">⚠ {formErr}</div>}

              {/* Cliente */}
              <div className="cf-fld">
                <label className="cf-fld-lbl">Cliente (opcional — balcão)</label>
                <select className="cf-sel" value={form.cliente_id} onChange={e=>F('cliente_id',e.target.value)}>
                  <option value="">Balcão (sem cliente)</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Toggle modo */}
              <div className="cf-toggle-modo">
                <button className={`cf-modo-prod${!modoLivre?' on':''}`} onClick={()=>setModoLivre(false)}>📦 Produto do catálogo</button>
                <button className={`cf-modo-livre${modoLivre?' on':''}`} onClick={()=>setModoLivre(true)}>✏ Valor livre</button>
              </div>

              {modoLivre ? (
                <>
                  <div className="cf-fld">
                    <label className="cf-fld-lbl">Descrição</label>
                    <input className="cf-inp" placeholder="Ex: serviço, produto avulso…" value={descLivre} onChange={e=>setDescLivre(e.target.value)}/>
                  </div>
                  <div className="cf-fld">
                    <label className="cf-fld-lbl">Valor total (R$)</label>
                    <input className="cf-inp" type="number" min="0.01" step="0.01" placeholder="0,00" value={valorLivre} onChange={e=>setValorLivre(e.target.value)} style={{fontSize:18,fontWeight:700,fontFamily:'var(--font-mono)'}}/>
                  </div>
                </>
              ) : (
                <div className="cf-fld">
                  <label className="cf-fld-lbl">Produtos</label>
                  <div style={{position:'relative'}}>
                    <input className="cf-inp" placeholder="Buscar produto por nome ou SKU…" value={prodBusca}
                      onChange={e=>{setProdBusca(e.target.value);setProdDrop(true);}} onFocus={()=>setProdDrop(true)}/>
                    {prodDrop && prodFiltrados.length>0 && (
                      <div className="cf-prod-drop">
                        {prodFiltrados.map(p=>(
                          <div key={p.id} className="cf-prod-opt" onClick={()=>addItem(p)}>
                            <span>{p.nome}</span>
                            <span style={{display:'flex',gap:10,alignItems:'center'}}>
                              <span style={{fontSize:11,color:'var(--text-muted)'}}>est. {p.estoque_atual}</span>
                              <strong style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{fmtBRL(p.preco_venda)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {itens.length>0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
                      {itens.map(i=>(
                        <div key={i.produto_id} className="cf-item-row">
                          <div style={{flex:1,fontSize:13,fontWeight:600}}>{i.nome}</div>
                          <button className="cf-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade-1)}>−</button>
                          <span style={{fontFamily:'var(--font-mono)',minWidth:22,textAlign:'center'}}>{i.quantidade}</span>
                          <button className="cf-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade+1)}>+</button>
                          <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--ok)',minWidth:78,textAlign:'right'}}>{fmtBRL(i.preco_unitario*i.quantidade)}</span>
                          <button className="cf-qty-btn" style={{borderColor:'transparent',color:'var(--crit)'}} onClick={()=>delItem(i.produto_id)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pagamento */}
              <div className="cf-sectitle">Pagamento</div>
              <div className="cf-fr2">
                <div className="cf-fld">
                  <label className="cf-fld-lbl">Forma de pagamento</label>
                  <select className="cf-sel" value={form.modo_pagamento} onChange={e=>F('modo_pagamento',e.target.value)}>
                    {PAGAMENTOS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                {!modoLivre && (
                  <div className="cf-fld">
                    <label className="cf-fld-lbl">Desconto geral (R$)</label>
                    <input className="cf-inp" type="number" min="0" step="0.01" placeholder="0,00" value={form.desconto_geral} onChange={e=>F('desconto_geral',e.target.value)}/>
                  </div>
                )}
              </div>

              <div className="cf-fr2">
                <div className="cf-fld">
                  <label className="cf-fld-lbl">Valor de entrada (R$)</label>
                  <input className="cf-inp" type="number" min="0" step="0.01" placeholder="0,00 — opcional" value={form.valor_entrada} onChange={e=>F('valor_entrada',e.target.value)}/>
                </div>
                <div className="cf-fld">
                  <label className="cf-fld-lbl">Vencimento</label>
                  <input className="cf-inp" type="date" value={form.data_vencimento} onChange={e=>F('data_vencimento',e.target.value)}/>
                </div>
              </div>

              <div className="cf-fr2">
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'var(--text-dim)'}}>
                  <input type="checkbox" checked={form.parcelado} onChange={e=>F('parcelado',e.target.checked)} style={{accentColor:'var(--brand)',width:15,height:15}}/>
                  Parcelar
                </label>
                {form.parcelado && (
                  <div className="cf-fld">
                    <label className="cf-fld-lbl">Nº de parcelas</label>
                    <select className="cf-sel" value={form.num_parcelas} onChange={e=>F('num_parcelas',e.target.value)}>
                      {[2,3,4,5,6,7,8,9,10,12].map(n=><option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="cf-fld">
                <label className="cf-fld-lbl">Observação</label>
                <input className="cf-inp" placeholder="Opcional…" value={form.observacao} onChange={e=>F('observacao',e.target.value)}/>
              </div>

              {/* Totais */}
              {total>0 && (
                <div className="cf-totais">
                  {descG>0 && <div className="cf-tot-row"><span style={{color:'var(--text-muted)'}}>Subtotal</span><span style={{fontFamily:'var(--font-mono)'}}>{fmtBRL(subtotal)}</span></div>}
                  {descG>0 && <div className="cf-tot-row"><span style={{color:'var(--text-muted)'}}>Desconto</span><span style={{fontFamily:'var(--font-mono)',color:'var(--crit)'}}>− {fmtBRL(descG)}</span></div>}
                  <div className="cf-tot-row" style={{fontSize:16,fontWeight:800}}><span>Total</span><span style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{fmtBRL(total)}</span></div>
                  {entrada>0 && <>
                    <div className="cf-tot-row" style={{borderTop:'1px solid var(--border)',paddingTop:6}}><span style={{color:'var(--ok)'}}>Entrada</span><span style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>− {fmtBRL(entrada)}</span></div>
                    <div className="cf-tot-row" style={{fontWeight:700}}><span>Restante</span><span style={{fontFamily:'var(--font-mono)',color:'var(--warn)'}}>{fmtBRL(restante)}</span></div>
                  </>}
                  {valParc && <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)',textAlign:'right'}}>{form.num_parcelas}x de {fmtBRL(valParc)}</div>}
                </div>
              )}
            </div>

            <div className="cf-vd-modal-foot">
              <button className="cf-btn cf-btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando…' : 'Confirmar venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="cf-toast">
          <span className={`cf-toast-ic${toast.type==='err'?' err':''}`}>
            <Ic d={toast.type==='err'?ICONS.alert:ICONS.check} size={14}/>
          </span>
          {txt(toast.msg)}
        </div>
      )}
    </div>
  );
}