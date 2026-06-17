import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

/* ── API ──────────────────────────────────────────────────────────────── */
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = {
  get:    url    => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post:   (u,b)  => fetch(BASE+u,{method:'POST',  headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:    (u,b)  => fetch(BASE+u,{method:'PUT',   headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:    url    => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

/* ── helpers ──────────────────────────────────────────────────────────── */
const pkBRL  = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const pkBRLk = v => { const n=Number(v||0); return n>=1000?`R$ ${(n/1000).toFixed(1)}k`:`R$ ${n.toFixed(0)}`; };
const pkTel  = t => t?(t.replace(/\D/g,'')).replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'):' — ';
const pkWa   = (tel,msg) => `https://wa.me/55${(tel||'').replace(/\D/g,'')}${msg?`?text=${encodeURIComponent(msg)}`:''}`;
const pkInit = n => (n||'?')[0].toUpperCase();
const txt    = v => v==null?'':(typeof v==='object'?(v.nome||v.produto||''):String(v));
const AV_COR = ['#9166db','#6d48c4','#c75c8a','#e08a2a','#21a06d','#3b82f6','#b3577f'];
const cor    = n => AV_COR[((n||'A').charCodeAt(0))%AV_COR.length];
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };

const PK_SEG = {
  atrasada: { label:'Atrasada', pill:'crit', color:'#e2514f', tone:'crit' },
  aberto:   { label:'Em aberto',pill:'warn', color:'#e08a2a', tone:'warn' },
  dia:      { label:'Em dia',   pill:'ok',   color:'#21a06d', tone:'ok'   },
};
const SEGMENTOS = [
  { key:'atrasada', titulo:'Atrasadas',        color:'#e2514f' },
  { key:'aberto',   titulo:'Devem (no prazo)', color:'#e08a2a' },
  { key:'dia',      titulo:'Em dia',           color:'#21a06d' },
];
const PK_RANK = { atrasada:3, aberto:2, dia:1 };
const MODOS   = ['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Fiado','Boleto','Transferência'];

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.pk-root *,.pk-root *::before,.pk-root *::after{box-sizing:border-box;}
.pk-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:pkIn .3s ease both;}
@keyframes pkIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pk-root[data-theme="dark"],.pk-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);--brand-ink:#fff;}
.pk-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);--brand-ink:#fff;}
.pk-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.pk-portal{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.pk-portal[data-theme="dark"],.pk-portal:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);--brand-ink:#fff;}
.pk-portal[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);--brand-ink:#fff;}
.pk-portal{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.pk-portal *,.pk-portal *::before,.pk-portal *::after{box-sizing:border-box;}

/* layout */
.pk-page{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}
.pk-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pk-head-title{font-size:22px;font-weight:800;}
.pk-head-sub{font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px;}

/* botões */
.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cf-btn:hover{border-color:var(--border-strong);}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-icon-btn{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .15s;flex-shrink:0;}
.cf-icon-btn svg{display:block;stroke:currentColor;}
.cf-icon-btn:hover{color:var(--text);border-color:var(--border-strong);}
.cf-icon-btn.danger{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 25%,transparent);background:color-mix(in oklab,var(--crit) 8%,transparent);}
.cf-icon-btn.danger:hover{background:color-mix(in oklab,var(--crit) 16%,transparent);}

/* pills */
.cf-pill{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-pill.info{background:var(--brand-soft);color:var(--brand);}
.cf-pill.muted{background:var(--track);color:var(--text-muted);}
.cf-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0;}
.cf-status-dot.crit{background:var(--crit);}.cf-status-dot.warn{background:var(--warn);}.cf-status-dot.ok{background:var(--ok);}

/* card base */
.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}

/* KPI strip */
.pk-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden;}
.cf-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;}
.cf-kpi.tone-brand::before{background:var(--brand);}
.cf-kpi.tone-crit::before{background:var(--crit);}
.cf-kpi.tone-warn::before{background:var(--warn);}
.cf-kpi.tone-info::before{background:var(--brand);}
.cf-kpi.tone-ok::before{background:var(--ok);}
.cf-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;}
.cf-kpi.tone-brand .cf-kpi-ic{background:var(--brand-soft);color:var(--brand);}
.cf-kpi.tone-crit  .cf-kpi-ic{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-kpi.tone-warn  .cf-kpi-ic{background:color-mix(in oklab,var(--warn) 14%,transparent);color:var(--warn);}
.cf-kpi.tone-info  .cf-kpi-ic{background:var(--brand-soft);color:var(--brand);}
.cf-kpi.tone-ok    .cf-kpi-ic{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}

/* pulse bar */
.pk-pulse{display:flex;flex-direction:column;gap:14px;padding:20px;}
.pk-pulse-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.pk-pulse-total{font-size:27px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;margin-top:4px;}
.pk-pulse-total small{font-size:12px;font-weight:500;color:var(--text-muted);font-family:var(--font-ui);margin-left:8px;}
.pk-kpis{display:flex;gap:24px;flex-wrap:wrap;}
.pk-kpi-v{font-size:18px;font-weight:800;font-family:var(--font-mono);}
.pk-kpi-l{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.pk-health{display:flex;height:11px;border-radius:6px;overflow:hidden;background:var(--track);}
.pk-health-seg{height:100%;cursor:pointer;transition:flex-grow .5s cubic-bezier(.22,1,.36,1),opacity .2s;}
.pk-health-seg:not(:last-child){border-right:2px solid var(--surface);}
.pk-health-seg:hover{filter:brightness(1.08);}
.pk-legend{display:flex;gap:16px;flex-wrap:wrap;}
.pk-leg{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-muted);cursor:pointer;transition:color .14s;}
.pk-leg:hover{color:var(--text);}
.pk-leg-sw{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.pk-leg b{font-family:var(--font-mono);color:var(--text);}
.pk-leg-val{font-family:var(--font-mono);font-size:10px;}

/* controls */
.pk-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.pk-search{display:flex;align-items:center;gap:9px;flex:1;min-width:230px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.pk-search:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.pk-search input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.pk-search input::placeholder{color:var(--text-muted);}
.pk-view-toggle{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:3px;}
.pk-view-btn{display:flex;align-items:center;gap:6px;padding:6px 13px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-ui);transition:all .15s;}
.pk-view-btn.active{background:var(--brand-soft);color:var(--brand);}
.pk-view-btn:not(.active):hover{color:var(--text);background:var(--surface-2);}
.pk-sort{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;font-size:12.5px;color:var(--text-dim);font-family:var(--font-ui);outline:none;cursor:pointer;}

/* rede (cards) */
.pk-rede{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--gap);}
.pk-pc{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;cursor:pointer;transition:border-color .16s,box-shadow .16s,transform .16s;display:flex;flex-direction:column;}
.pk-pc:hover{border-color:var(--border-strong);box-shadow:0 10px 30px rgba(28,20,36,.1);transform:translateY(-2px);}
.pk-pc-strip{height:3px;flex-shrink:0;}
.pk-pc-top{padding:16px 16px 13px;display:flex;align-items:flex-start;gap:11px;}
.pk-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0;}
.pk-pc-name{font-size:15px;font-weight:700;display:flex;align-items:center;gap:7px;}
.pk-pc-meta{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.pk-pc-fin{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin:0 16px;border-radius:var(--radius-sm);overflow:hidden;}
.pk-fin-cell{background:var(--surface-2);padding:11px 13px;}
.pk-fin-l{font-size:9px;font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;display:flex;align-items:center;gap:5px;}
.pk-fin-v{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.pk-pc-prog{margin:13px 16px 0;}
.pk-prog-bar{height:5px;background:var(--track);border-radius:3px;overflow:hidden;}
.pk-prog-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--ok),var(--brand));transition:width .6s;}
.pk-prog-foot{display:flex;justify-content:space-between;font-size:9.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.pk-pc-cli{padding:13px 16px 0;}
.pk-cli-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;}
.pk-cli-h-l{font-size:10px;font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);}
.pk-cluster{display:flex;align-items:center;}
.pk-cluster-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;border:2px solid var(--surface);margin-left:-7px;}
.pk-cluster-av:first-child{margin-left:0;}
.pk-cluster-more{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--text-dim);background:var(--surface-2);border:2px solid var(--surface);margin-left:-7px;}
.pk-pc-actions{display:flex;gap:6px;padding:14px 16px;margin-top:13px;border-top:1px solid var(--border);}
.pk-act{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font-size:11.5px;font-weight:600;cursor:pointer;transition:all .14s;text-decoration:none;font-family:var(--font-ui);}
.pk-act:hover{color:var(--text);border-color:var(--border-strong);}
.pk-act.wa:hover{background:color-mix(in oklab,#25d366 13%,transparent);color:#17a34a;border-color:color-mix(in oklab,#25d366 28%,transparent);}
.pk-act.pay:hover{background:var(--brand-soft);color:var(--brand);border-color:var(--brand-line);}

/* árvore */
.pk-tree{display:flex;flex-direction:column;gap:10px;}
.pk-branch{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.pk-branch-head{display:flex;align-items:center;gap:13px;padding:14px 18px;cursor:pointer;transition:background .14s;}
.pk-branch-head:hover{background:var(--surface-2);}
.pk-branch-name{font-size:14.5px;font-weight:700;display:flex;align-items:center;gap:8px;}
.pk-branch-sub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.pk-branch-fin{display:flex;gap:24px;align-items:center;}
.pk-bf{text-align:right;}
.pk-bf-l{font-size:9px;font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);}
.pk-bf-v{font-size:14px;font-weight:800;font-family:var(--font-mono);margin-top:2px;}
.pk-branch-chev{font-size:11px;color:var(--text-muted);transition:transform .2s;flex-shrink:0;}
.pk-branch-chev.open{transform:rotate(180deg);}
.pk-branch-body{border-top:1px solid var(--border);background:var(--surface-2);padding:6px 0;}
.pk-twig{display:grid;grid-template-columns:24px 1fr auto auto;gap:12px;align-items:center;padding:9px 18px 9px 40px;cursor:pointer;transition:background .12s;position:relative;}
.pk-twig:hover{background:color-mix(in oklab,var(--brand) 5%,transparent);}
.pk-twig::before{content:"";position:absolute;left:26px;top:0;bottom:50%;width:1px;background:var(--border-strong);}
.pk-twig::after{content:"";position:absolute;left:26px;top:50%;width:8px;height:1px;background:var(--border-strong);}
.pk-twig-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;}
.pk-twig-name{font-size:12.5px;font-weight:600;}
.pk-twig-tel{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);}
.pk-twig-val{font-size:12px;font-family:var(--font-mono);font-weight:700;text-align:right;min-width:80px;}

/* lista/tabela */
.pk-tbl-head,.pk-tbl-row{display:grid;grid-template-columns:2.2fr 1fr 1.1fr 1.1fr 1fr 96px;gap:12px;align-items:center;padding:11px 18px;}
.pk-tbl-head{border-bottom:1px solid var(--border);font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.pk-tbl-row{border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;}
.pk-tbl-row:last-child{border-bottom:none;}
.pk-tbl-row:hover{background:var(--surface-2);}
.pk-tbl-cli{display:flex;align-items:center;gap:10px;min-width:0;}
.pk-tbl-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pk-tbl-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.pk-tbl-mono{font-family:var(--font-mono);font-size:12.5px;font-weight:600;}
.pk-tbl-acts{display:flex;gap:5px;justify-content:flex-end;}
@media(max-width:900px){.pk-tbl-head,.pk-tbl-row{grid-template-columns:2fr 1fr 86px;}.pk-col-hide{display:none;}}

/* drawer (lateral) */
.pk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.38);backdrop-filter:blur(3px);z-index:140;animation:pkFade .2s ease both;}
@keyframes pkFade{from{opacity:0}to{opacity:1}}
.pk-drawer{position:fixed;right:0;top:0;bottom:0;width:460px;max-width:100vw;background:var(--surface);border-left:1px solid var(--border);z-index:150;overflow-y:auto;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(28,20,36,.12);animation:pkSlide .32s cubic-bezier(.22,1,.36,1) both;}
@keyframes pkSlide{from{transform:translateX(100%)}to{transform:none}}
.pk-drawer::-webkit-scrollbar{width:5px;}.pk-drawer::-webkit-scrollbar-thumb{background:var(--track);border-radius:3px;}
.pk-dh{padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.pk-dh-av{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;}
.pk-dh-name{font-size:17px;font-weight:800;line-height:1.25;}
.pk-dh-meta{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.pk-dbody{padding:18px 20px;flex:1;display:flex;flex-direction:column;gap:20px;}
.pk-dsec-t{font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:11px;}
.pk-kpis3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.pk-kc{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 12px;}
.pk-kc-l{font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.pk-kc-v{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.pk-vendas-box{background:linear-gradient(135deg,var(--brand-soft),color-mix(in oklab,var(--ok) 6%,transparent));border:1px solid var(--brand-line);border-radius:var(--radius);padding:16px 18px;display:flex;flex-direction:column;gap:14px;}
.pk-vb-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.pk-vb-l{font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.pk-vb-v{font-size:16px;font-weight:800;font-family:var(--font-mono);}
.pk-vb-prog{height:5px;background:var(--track);border-radius:3px;overflow:hidden;}
.pk-vb-prog>span{display:block;height:100%;background:linear-gradient(90deg,var(--ok),var(--brand));border-radius:3px;transition:width .6s;}
.pk-vendas-lista{display:flex;flex-direction:column;gap:5px;}
.pk-venda-row{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.02);border-radius:8px;font-size:12px;border:1px solid var(--border);}
.pk-compra{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:9px;}
.pk-compra-h{padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .13s;}
.pk-compra-h:hover{background:var(--elevated);}
.pk-compra-total{font-size:13px;font-weight:700;font-family:var(--font-mono);}
.pk-compra-chev{font-size:10px;color:var(--text-muted);transition:transform .2s;}
.pk-compra-chev.open{transform:rotate(180deg);}
.pk-compra-body{border-top:1px solid var(--border);padding:12px 14px;display:flex;flex-direction:column;gap:13px;}
.pk-item{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0;}
.pk-item-n{font-weight:600;}
.pk-repasse{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.pk-repasse:last-child{border-bottom:none;}
.pk-repasse-d{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);flex:1;}
.pk-repasse-v{font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--ok);}
.pk-subhead{font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;}
.pk-cli-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.pk-cli-row:last-child{border-bottom:none;}
.pk-cli-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}
.pk-cli-name{font-size:13px;font-weight:600;}
.pk-cli-tel{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);}
.pk-dfoot{padding:13px 20px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}

/* modais */
.pk-mbg{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pkFade .2s ease both;}
.pk-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:480px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(28,20,36,.3);max-height:92vh;}
.pk-modal-lg{max-width:580px;}
.pk-mhead{padding:17px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.pk-mtitle{font-size:14.5px;font-weight:800;display:flex;align-items:center;gap:9px;white-space:nowrap;}
.pk-mtitle-ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--brand-soft);color:var(--brand);}
.pk-msub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.pk-mbody{padding:18px 20px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;}
.pk-mfoot{padding:13px 20px;border-top:1px solid var(--border);display:flex;gap:9px;}
.pk-fld{display:flex;flex-direction:column;gap:5px;}
.pk-fld-l{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.pk-inp,.pk-sel{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .18s,box-shadow .18s;}
.pk-inp:focus,.pk-sel:focus{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.pk-inp::placeholder{color:var(--text-muted);}
.pk-inp.big{font-size:20px;font-weight:700;font-family:var(--font-mono);}
.pk-row2{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.pk-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.pk-toggle-modo{display:flex;gap:6px;background:var(--surface-2);border-radius:10px;padding:4px;}
.pk-toggle-btn{flex:1;padding:8px;border-radius:7px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;font-family:var(--font-ui);transition:all .2s;background:transparent;color:var(--text-muted);}
.pk-toggle-btn.on-prod{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.pk-toggle-btn.on-livre{background:color-mix(in oklab,var(--warn) 15%,transparent);color:var(--warn);}
.pk-prod-drop{position:absolute;top:100%;left:0;right:0;background:var(--elevated);border:1px solid var(--border-strong);border-radius:9px;margin-top:4px;z-index:20;max-height:180px;overflow-y:auto;box-shadow:var(--shadow);}
.pk-prod-opt{padding:9px 13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:13px;border-bottom:1px solid var(--border);}
.pk-prod-opt:hover{background:var(--surface-2);}
.pk-item-row{display:flex;align-items:center;gap:9px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 12px;}
.pk-qty-btn{width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}
.pk-totais{background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:11px;padding:14px 16px;display:flex;flex-direction:column;gap:7px;}
.pk-tot-row{display:flex;justify-content:space-between;font-size:13px;}

/* skel / empty / toast */
.pk-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:pkSh 1.5s infinite;border-radius:8px;}
@keyframes pkSh{from{background-position:200% 0}to{background-position:-200% 0}}
.pk-empty{padding:64px 20px;text-align:center;color:var(--text-muted);}
.pk-empty-icon{font-size:34px;opacity:.3;margin-bottom:12px;}
.pk-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:pkFade .3s ease both;white-space:nowrap;}
.pk-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.pk-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}

@media(max-width:1100px){.pk-kpi-strip{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.pk-kpi-strip{grid-template-columns:1fr;}.pk-row2{grid-template-columns:1fr;}}
/* modal central parceira */
.pk-det-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:160;display:flex;align-items:center;justify-content:center;padding:16px;animation:pkFade .2s ease both;}
.pk-det-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:18px;width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.5);}
.pk-det-hd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:14px;flex-shrink:0;}
.pk-det-av{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;flex-shrink:0;}
.pk-det-name{font-size:18px;font-weight:800;line-height:1.2;}
.pk-det-meta{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.pk-det-tabs{display:flex;gap:2px;padding:0 22px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;}
.pk-det-tab{padding:11px 16px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text-muted);font-family:var(--font-ui);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;white-space:nowrap;}
.pk-det-tab.on{color:var(--brand);border-bottom-color:var(--brand);}
.pk-det-tab:hover:not(.on){color:var(--text);}
.pk-det-body{overflow-y:auto;flex:1;padding:20px 22px;display:flex;flex-direction:column;gap:18px;}
.pk-det-body::-webkit-scrollbar{width:5px;}.pk-det-body::-webkit-scrollbar-thumb{background:var(--track);border-radius:3px;}
.pk-det-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}
.pk-cli-add-row{display:flex;gap:9px;padding:13px;background:var(--surface-2);border:1px dashed var(--border-strong);border-radius:var(--radius-sm);margin-bottom:10px;}
.pk-cli-add-row input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);padding:4px 0;}
.pk-cli-add-row input::placeholder{color:var(--text-muted);}

`;

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.9}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>
    {d}
  </svg>
);
const ICONS = {
  users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  arrowIn: <><path d="M12 5v14M5 12l7 7 7-7"/></>,
  arrowOut:<><path d="M12 19V5M5 12l7-7 7 7"/></>,
  sparkle: <><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/></>,
  cart:    <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  search:  <><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>,
  plus:    <><path d="M12 5v14M5 12h14"/></>,
  grid:    <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  layers:  <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  chart:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  x:       <><path d="M18 6L6 18M6 6l12 12"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
  edit:    <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
  dollar:  <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
};
const IcoWa = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{display:'block',flexShrink:0}}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12.006 2C6.476 2 2 6.474 2 12c0 1.765.461 3.496 1.34 5.014L2 22l5.118-1.342A10.001 10.001 0 0 0 12.006 22C17.534 22 22 17.526 22 12S17.534 2 12.006 2zm0 18.188a8.188 8.188 0 0 1-4.189-1.15l-.3-.178-3.036.796.811-2.965-.195-.31A8.157 8.157 0 0 1 3.813 12c0-4.52 3.677-8.2 8.193-8.2 4.518 0 8.194 3.68 8.194 8.2 0 4.52-3.676 8.188-8.194 8.188z"/>
  </svg>
);

/* ── Portal ───────────────────────────────────────────────────────────── */
function Portal({children, theme}) {
  useEffect(()=>{ const p=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=p; }; },[]);
  return createPortal(<div className="pk-portal" data-theme={theme}>{children}</div>, document.body);
}

/* ── KpiStrip ─────────────────────────────────────────────────────────── */
function KpiStrip({parceiras}) {
  const devemAMim = parceiras.reduce((a,p)=>a+p.saldo_em_aberto,0);
  const comDebito = parceiras.filter(p=>p.saldo_em_aberto>0).length;
  const totalCli  = parceiras.reduce((a,p)=>a+(p.num_clientes||0),0);
  const aReceber  = parceiras.reduce((a,p)=>a+(p.vendas_resumo?.saldo_receber||0),0);
  const items = [
    {lbl:'Parceiras ativas', val:String(parceiras.length), tone:'brand', ic:'users',   sub:`${comDebito} com débito`},
    {lbl:'Devem a você',     val:pkBRL(devemAMim),         tone:'crit',  ic:'arrowIn', sub:'saldo de compras'},
    {lbl:'Clientes na rede', val:String(totalCli),         tone:'info',  ic:'sparkle', sub:`${parceiras.length} carteiras`},
    {lbl:'A receber delas',  val:pkBRL(aReceber),          tone:'warn',  ic:'cart',    sub:'vendas das parceiras'},
  ];
  return (
    <div className="pk-kpi-strip">
      {items.map(k=>(
        <div key={k.lbl} className={`cf-kpi tone-${k.tone}`}>
          <div className="cf-kpi-top"><div className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></div></div>
          <div className="cf-kpi-val">{k.val}</div>
          <div><div className="cf-kpi-lbl">{k.lbl}</div><div className="cf-kpi-sub">{k.sub}</div></div>
        </div>
      ))}
    </div>
  );
}

/* ── PulseBar ─────────────────────────────────────────────────────────── */
function PulseBar({parceiras, activeSeg, onSeg}) {
  const totalDevido   = parceiras.reduce((a,p)=>a+p.saldo_em_aberto,0);
  const totalRepasses = parceiras.reduce((a,p)=>a+(p.total_repasses||0),0);
  const porSeg = {};
  SEGMENTOS.forEach(s=>{ porSeg[s.key]={count:0,valor:0,...s}; });
  parceiras.forEach(p=>{ if(porSeg[p.status]){porSeg[p.status].count++;porSeg[p.status].valor+=p.saldo_em_aberto;} });
  const segsBar = SEGMENTOS.filter(s=>s.key!=='dia'&&porSeg[s.key].valor>0);
  const somaBar = segsBar.reduce((a,s)=>a+porSeg[s.key].valor,0)||1;
  const atrasada = porSeg.atrasada||{count:0,valor:0};
  return (
    <div className="cf-card">
      <div className="pk-pulse">
        <div className="pk-pulse-top">
          <div>
            <div style={{fontSize:10,fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'.13em',color:'var(--text-muted)',marginBottom:6}}>Total que as parceiras te devem</div>
            <div className="pk-pulse-total">{pkBRL(totalDevido)}<small>{parceiras.filter(p=>p.saldo_em_aberto>0).length} com saldo</small></div>
          </div>
          <div className="pk-kpis">
            <div><div className="pk-kpi-v" style={{color:'var(--crit)'}}>{pkBRL(atrasada.valor)}</div><div className="pk-kpi-l">{atrasada.count} atrasada(s)</div></div>
            <div><div className="pk-kpi-v" style={{color:'var(--ok)'}}>{pkBRL(totalRepasses)}</div><div className="pk-kpi-l">já repassado</div></div>
            <div><div className="pk-kpi-v">{(porSeg.dia||{count:0}).count}</div><div className="pk-kpi-l">em dia</div></div>
          </div>
        </div>
        <div className="pk-health">
          {segsBar.map(s=>(
            <div key={s.key} className="pk-health-seg"
              title={`${s.titulo}: ${pkBRL(porSeg[s.key].valor)}`}
              onClick={()=>onSeg(activeSeg===s.key?null:s.key)}
              style={{flexGrow:porSeg[s.key].valor/somaBar,background:s.color,opacity:!activeSeg||activeSeg===s.key?1:.28}}/>
          ))}
          {totalDevido===0 && <div className="pk-health-seg" style={{flexGrow:1,background:'var(--ok)'}}/>}
        </div>
        <div className="pk-legend">
          {SEGMENTOS.map(s=>{
            const seg=porSeg[s.key]||{count:0,valor:0};
            return (
              <div key={s.key} className="pk-leg" onClick={()=>onSeg(activeSeg===s.key?null:s.key)}
                style={{opacity:!activeSeg||activeSeg===s.key?1:.4}}>
                <span className="pk-leg-sw" style={{background:s.color}}/>
                {s.titulo} <b>{seg.count}</b>
                {seg.valor>0&&<span className="pk-leg-val">· {pkBRLk(seg.valor)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── PartnerCard ──────────────────────────────────────────────────────── */
function PartnerCard({p, onOpen, onRepasse, theme}) {
  const meta = PK_SEG[p.status]||PK_SEG.dia;
  const vr   = p.vendas_resumo||{total_vendido:0,total_recebido:0,saldo_receber:0,num_vencidas:0,num_vendas:0};
  const pct  = vr.total_vendido>0?Math.min((vr.total_recebido/vr.total_vendido)*100,100):0;
  const clientes = p.clientes||[];
  const cobrarMsg = `Oi ${p.nome.split(' ')[0]}! Passando para alinhar o saldo de ${pkBRL(p.saldo_em_aberto)} das compras. 💜`;
  return (
    <div className="pk-pc" onClick={()=>onOpen(p)}>
      <div className="pk-pc-strip" style={{background:meta.color}}/>
      <div className="pk-pc-top">
        <div className="pk-av" style={{background:cor(p.nome),width:44,height:44,fontSize:17}}>{pkInit(p.nome)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="pk-pc-name">{p.nome}<span className={`cf-pill ${meta.pill}`} style={{fontSize:9}}>{meta.label}</span></div>
          <div className="pk-pc-meta">{p.cidade||'—'} · {pkTel(p.telefone)}</div>
        </div>
      </div>
      <div className="pk-pc-fin">
        <div className="pk-fin-cell">
          <div className="pk-fin-l"><span className="cf-status-dot crit"/>Deve a você</div>
          <div className="pk-fin-v" style={{color:p.saldo_em_aberto>0?meta.color:'var(--text-muted)'}}>{p.saldo_em_aberto>0?pkBRL(p.saldo_em_aberto):'—'}</div>
        </div>
        <div className="pk-fin-cell">
          <div className="pk-fin-l"><span className="cf-status-dot warn"/>Carteira dela</div>
          <div className="pk-fin-v" style={{color:vr.saldo_receber>0?'var(--warn)':'var(--text-muted)'}}>{vr.saldo_receber>0?pkBRL(vr.saldo_receber):'—'}</div>
        </div>
      </div>
      <div className="pk-pc-prog">
        <div className="pk-prog-bar"><div className="pk-prog-fill" style={{width:`${pct}%`}}/></div>
        <div className="pk-prog-foot">
          <span>{pct.toFixed(0)}% recebido das vendas</span>
          {vr.num_vencidas>0&&<span style={{color:'var(--crit)'}}>{vr.num_vencidas} atrasada(s)</span>}
        </div>
      </div>
      <div className="pk-pc-cli">
        <div className="pk-cli-head"><span className="pk-cli-h-l">{p.num_clientes||0} clientes</span></div>
        <div className="pk-cluster">
          {clientes.slice(0,5).map(c=>(
            <div key={c.id} className="pk-cluster-av" style={{background:cor(c.nome)}} title={c.nome}>{pkInit(c.nome)}</div>
          ))}
          {(p.num_clientes||0)>5&&<div className="pk-cluster-more">+{p.num_clientes-5}</div>}
        </div>
      </div>
      <div className="pk-pc-actions" onClick={e=>e.stopPropagation()}>
        <a className="pk-act wa" href={pkWa(p.telefone,p.saldo_em_aberto>0?cobrarMsg:'')} target="_blank" rel="noreferrer">
          <IcoWa size={12}/> WhatsApp
        </a>
        {p.saldo_em_aberto>0
          ?<button className="pk-act pay" onClick={()=>onRepasse(p,null)}><Ic d={ICONS.arrowIn} size={12}/> Repasse</button>
          :<button className="pk-act" onClick={()=>onOpen(p)}><Ic d={ICONS.arrowOut} size={12}/> Detalhes</button>}
        <button className="pk-act" onClick={()=>onOpen(p)}><Ic d={ICONS.users} size={12}/></button>
      </div>
    </div>
  );
}

/* ── RedeView ─────────────────────────────────────────────────────────── */
function RedeView({parceiras, onOpen, onRepasse, theme}) {
  return (
    <div className="pk-rede">
      {parceiras.map(p=><PartnerCard key={p.id} p={p} onOpen={onOpen} onRepasse={onRepasse} theme={theme}/>)}
    </div>
  );
}

/* ── TreeView ─────────────────────────────────────────────────────────── */
function TreeView({parceiras, onOpen, openMap, onToggle}) {
  return (
    <div className="pk-tree">
      {parceiras.map(p=>{
        const meta=PK_SEG[p.status]||PK_SEG.dia;
        const open=openMap[p.id];
        const clientes=p.clientes||[];
        return (
          <div className="pk-branch" key={p.id}>
            <div className="pk-branch-head" onClick={()=>onToggle(p.id)}>
              <div className="pk-av" style={{background:cor(p.nome),width:38,height:38,fontSize:15}}>{pkInit(p.nome)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="pk-branch-name">{p.nome}<span className={`cf-pill ${meta.pill}`} style={{fontSize:9}}>{meta.label}</span></div>
                <div className="pk-branch-sub">{p.num_clientes||0} clientes · {p.cidade||'—'}</div>
              </div>
              <div className="pk-branch-fin">
                <div className="pk-bf">
                  <div className="pk-bf-l">Deve a você</div>
                  <div className="pk-bf-v" style={{color:p.saldo_em_aberto>0?meta.color:'var(--text-muted)'}}>{p.saldo_em_aberto>0?pkBRL(p.saldo_em_aberto):'—'}</div>
                </div>
                <div className="pk-bf">
                  <div className="pk-bf-l">A receber dela</div>
                  <div className="pk-bf-v" style={{color:(p.vendas_resumo?.saldo_receber||0)>0?'var(--warn)':'var(--text-muted)'}}>{(p.vendas_resumo?.saldo_receber||0)>0?pkBRL(p.vendas_resumo.saldo_receber):'—'}</div>
                </div>
                <span className={`pk-branch-chev${open?' open':''}`}>▼</span>
              </div>
            </div>
            {open&&(
              <div className="pk-branch-body">
                {clientes.length===0
                  ?<div style={{padding:'14px 40px',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>Nenhuma cliente vinculada</div>
                  :clientes.map(c=>(
                    <div className="pk-twig" key={c.id} onClick={()=>onOpen(p)}>
                      <div className="pk-twig-av" style={{background:cor(c.nome)}}>{pkInit(c.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div className="pk-twig-name">{c.nome}</div>
                        <div className="pk-twig-tel">{pkTel(c.telefone)}</div>
                      </div>
                      <div className="pk-twig-val" style={{color:'var(--text-muted)'}}>{pkBRL(c.total_comprado||0)}</div>
                      <div className="pk-twig-val" style={{color:(c.saldo_em_aberto||0)>0?'var(--warn)':'var(--ok)'}}>
                        {(c.saldo_em_aberto||0)>0?pkBRL(c.saldo_em_aberto):'em dia'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── ListView ─────────────────────────────────────────────────────────── */
function ListView({parceiras, onOpen, onRepasse, sort, setSort}) {
  const Th = ({k,children,style}) => (
    <span style={{cursor:'pointer',...style}} onClick={()=>setSort(k)}>{children}{sort===k?' ↓':''}</span>
  );
  return (
    <div className="cf-card">
      <div className="pk-tbl-head">
        <span>Parceira</span>
        <Th k="status">Status</Th>
        <Th k="deve">Deve a você</Th>
        <span className="pk-col-hide">A receber dela</span>
        <Th k="clientes" className="pk-col-hide">Clientes</Th>
        <span style={{textAlign:'right'}}>Ações</span>
      </div>
      {parceiras.map(p=>{
        const meta=PK_SEG[p.status]||PK_SEG.dia;
        return (
          <div className="pk-tbl-row" key={p.id} onClick={()=>onOpen(p)}>
            <div className="pk-tbl-cli">
              <div className="pk-av" style={{background:cor(p.nome),width:32,height:32,fontSize:13}}>{pkInit(p.nome)}</div>
              <div style={{minWidth:0}}>
                <div className="pk-tbl-name">{p.nome}</div>
                <div className="pk-tbl-sub">{p.cidade||'—'} · {pkTel(p.telefone)}</div>
              </div>
            </div>
            <div><span className={`cf-pill ${meta.pill}`}>{meta.label}</span></div>
            <div className="pk-tbl-mono" style={{color:p.saldo_em_aberto>0?meta.color:'var(--text-muted)'}}>{p.saldo_em_aberto>0?pkBRL(p.saldo_em_aberto):'—'}</div>
            <div className="pk-col-hide pk-tbl-mono" style={{color:(p.vendas_resumo?.saldo_receber||0)>0?'var(--warn)':'var(--text-muted)'}}>{(p.vendas_resumo?.saldo_receber||0)>0?pkBRL(p.vendas_resumo.saldo_receber):'—'}</div>
            <div className="pk-col-hide pk-tbl-sub">{p.num_clientes||0} clientes · {p.num_compras||0} compras</div>
            <div className="pk-tbl-acts" onClick={e=>e.stopPropagation()}>
              <a className="cf-icon-btn" href={pkWa(p.telefone)} target="_blank" rel="noreferrer" title="WhatsApp" style={{color:'inherit',textDecoration:'none'}}><IcoWa size={14}/></a>
              {p.saldo_em_aberto>0&&<button className="cf-icon-btn" title="Registrar repasse" onClick={()=>onRepasse(p,null)}><Ic d={ICONS.arrowIn} size={14}/></button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── PartnerModal (central, via Portal) ──────────────────────────────── */
function PartnerModal({parceira, detalhe, loadingDetalhe, onClose, onRepasse, onVendaCli, onNovaCompra, onDeletarCli, onAdicionarCli, onDeletarParceira, theme}) {
  const [aba, setAba] = useState('geral');
  const [openCompra, setOpenCompra] = useState({});
  const [addCli, setAddCli] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [addErr, setAddErr] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const toggle = id => setOpenCompra(s=>({...s,[id]:!s[id]}));
  const meta = PK_SEG[parceira.status]||PK_SEG.dia;
  const d = detalhe||{compras:[],clientes:[],total_compras:0,total_repasses:0,saldo_em_aberto:0,vendas_resumo:{},vendas:[]};
  const vr = d.vendas_resumo||{};
  const pct = (vr.total_vendido||0)>0?Math.min(((vr.total_recebido||0)/(vr.total_vendido||1))*100,100):0;
  const cobrarMsg = `Oi ${parceira.nome.split(' ')[0]}! Sobre o saldo de ${pkBRL(parceira.saldo_em_aberto)} das compras 💜`;

  const salvarCli = async() => {
    if(!novoNome.trim()){setAddErr('Nome é obrigatório.');return;}
    setAddSaving(true); setAddErr('');
    try{ await onAdicionarCli(parceira.id, {nome:novoNome.trim(),telefone:novoTel}); setNovoNome(''); setNovoTel(''); setAddCli(false); }
    catch(e){setAddErr(e.message);}
    finally{setAddSaving(false);}
  };

  return (
    <Portal theme={theme}>
      <div className="pk-det-ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="pk-det-modal">

          {/* Header */}
          <div className="pk-det-hd">
            <div className="pk-det-av" style={{background:cor(parceira.nome)}}>{pkInit(parceira.nome)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="pk-det-name">{parceira.nome}</div>
              <div className="pk-det-meta">{pkTel(parceira.telefone)} · {parceira.cidade||'—'} · {parceira.email||''}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
                <span className={`cf-pill ${meta.pill}`}>{meta.label}</span>
                {parceira.saldo_em_aberto>0&&<span className="cf-pill crit">{pkBRL(parceira.saldo_em_aberto)} em aberto</span>}
                {(vr.saldo_receber||0)>0&&<span className="cf-pill warn">carteira: {pkBRL(vr.saldo_receber)}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <a className="cf-icon-btn" href={pkWa(parceira.telefone,cobrarMsg)} target="_blank" rel="noreferrer" title="WhatsApp" style={{textDecoration:'none',color:'inherit'}}>
                <IcoWa size={15}/>
              </a>
              <button className="cf-icon-btn" onClick={onClose}><Ic d={ICONS.x} size={15}/></button>
            </div>
          </div>

          {/* Abas */}
          <div className="pk-det-tabs">
            {[
              {k:'geral',  lbl:'Visão geral'},
              {k:'compras',lbl:`Compras (${d.compras.length})`},
              {k:'clientes',lbl:`Clientes (${(d.clientes||[]).length})`},
            ].map(t=>(
              <button key={t.k} className={`pk-det-tab${aba===t.k?' on':''}`} onClick={()=>setAba(t.k)}>{t.lbl}</button>
            ))}
          </div>

          {/* Corpo */}
          <div className="pk-det-body">
            {loadingDetalhe ? (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="pk-skel" style={{height:52}}/>)}</div>
            ) : (

              /* ── ABA GERAL ── */
              aba==='geral' ? (
                <>
                  {/* KPIs conta da parceira */}
                  <div>
                    <div className="pk-dsec-t">Conta da parceira (compras de mim)</div>
                    <div className="pk-kpis3">
                      <div className="pk-kc"><div className="pk-kc-l">Comprou</div><div className="pk-kc-v">{pkBRL(d.total_compras)}</div></div>
                      <div className="pk-kc"><div className="pk-kc-l">Repassou</div><div className="pk-kc-v" style={{color:'var(--ok)'}}>{pkBRL(d.total_repasses)}</div></div>
                      <div className="pk-kc"><div className="pk-kc-l">Em aberto</div><div className="pk-kc-v" style={{color:d.saldo_em_aberto>0?'var(--crit)':'var(--ok)'}}>{pkBRL(d.saldo_em_aberto)}</div></div>
                    </div>
                  </div>

                  {/* Mini-dashboard vendas da carteira */}
                  {(vr.num_vendas||0)>0 && (
                    <div className="pk-vendas-box">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--brand)',fontFamily:'var(--font-mono)'}}>💰 Vendas da carteira dela</div>
                        <span style={{fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{(d.clientes||[]).length} clientes · {(d.vendas||[]).length} vendas</span>
                      </div>
                      <div className="pk-vb-grid">
                        <div><div className="pk-vb-l">Vendido</div><div className="pk-vb-v">{pkBRL(vr.total_vendido||0)}</div></div>
                        <div><div className="pk-vb-l">Recebido</div><div className="pk-vb-v" style={{color:'var(--ok)'}}>{pkBRL(vr.total_recebido||0)}</div></div>
                        <div><div className="pk-vb-l">A receber</div><div className="pk-vb-v" style={{color:(vr.saldo_receber||0)>0?'var(--warn)':'var(--ok)'}}>{pkBRL(vr.saldo_receber||0)}</div></div>
                      </div>
                      <div>
                        <div className="pk-vb-prog"><span style={{width:`${pct}%`}}/></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,fontFamily:'var(--font-mono)',color:'var(--text-muted)',marginTop:5}}>
                          <span>{pct.toFixed(0)}% recebido</span>
                          {(vr.num_vencidas||0)>0&&<span style={{color:'var(--crit)'}}>{vr.num_vencidas} atrasada(s)</span>}
                        </div>
                      </div>
                      {(d.vendas||[]).length>0&&(
                        <div className="pk-vendas-lista">
                          {(d.vendas||[]).slice(0,4).map(v=>{
                            const cls=v.status_pagamento==='pago'?'var(--ok)':v.status_pagamento==='vencido'?'var(--crit)':'var(--warn)';
                            const lbl=v.status_pagamento==='pago'?'PAGO':v.status_pagamento==='vencido'?'VENCIDO':'ABERTO';
                            return (
                              <div key={v.id} className="pk-venda-row">
                                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{txt(v.cliente)}</span>
                                <span style={{fontSize:9,fontWeight:700,color:cls,fontFamily:'var(--font-mono)'}}>{lbl}</span>
                                <span style={{fontFamily:'var(--font-mono)',fontWeight:700,minWidth:72,textAlign:'right'}}>{pkBRL(v.valor_total)}</span>
                              </div>
                            );
                          })}
                          {(d.vendas||[]).length>4&&<div style={{textAlign:'center',fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)',paddingTop:4}}>+{d.vendas.length-4} — ver em Vendas / Relatórios</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumo compras na visão geral */}
                  {d.compras.length>0&&(
                    <div>
                      <div className="pk-dsec-t">Última(s) compra(s)</div>
                      {d.compras.slice(0,2).map(c=>{
                        const pillCls=c.status_pag==='pago'?'ok':c.vencido?'crit':'warn';
                        const pillLbl=c.status_pag==='pago'?'✓ PAGO':c.vencido?'VENCIDO':c.status_pag==='parcelado'?'PARCELADO':'EM ABERTO';
                        return (
                          <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:7}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                                <span className={`cf-pill ${pillCls}`} style={{fontSize:9}}>{pillLbl}</span>
                                {c.saldo>0&&<span style={{fontSize:10.5,fontFamily:'var(--font-mono)',color:'var(--warn)'}}>falta {pkBRL(c.saldo)}</span>}
                              </div>
                              <div style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>{c.criado_em} · vence {c.vencimento}</div>
                            </div>
                            <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:14}}>{pkBRL(c.valor_total)}</div>
                            {c.saldo>0&&<button className="cf-btn" style={{padding:'5px 10px',fontSize:11,borderRadius:8}} onClick={()=>onRepasse(parceira,c)}>+ Repasse</button>}
                          </div>
                        );
                      })}
                      {d.compras.length>2&&<button className="cf-btn cf-btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:12}} onClick={()=>setAba('compras')}>Ver todas as {d.compras.length} compras →</button>}
                    </div>
                  )}

                  {/* Resumo clientes na visão geral */}
                  {(d.clientes||[]).length>0&&(
                    <div>
                      <div className="pk-dsec-t">Clientes ({(d.clientes||[]).length})</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                        {(d.clientes||[]).slice(0,6).map(c=>(
                          <div key={c.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 10px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8}}>
                            <div className="pk-cli-av" style={{background:cor(c.nome),width:24,height:24,fontSize:10}}>{pkInit(c.nome)}</div>
                            <span style={{fontSize:12,fontWeight:600}}>{c.nome.split(' ')[0]}</span>
                            {(c.saldo_em_aberto||0)>0&&<span className="cf-pill warn" style={{fontSize:8}}>{pkBRL(c.saldo_em_aberto)}</span>}
                          </div>
                        ))}
                        {(d.clientes||[]).length>6&&<button className="cf-btn cf-btn-ghost" style={{padding:'6px 10px',fontSize:11,borderRadius:8}} onClick={()=>setAba('clientes')}>+{d.clientes.length-6} →</button>}
                      </div>
                    </div>
                  )}
                </>

              /* ── ABA COMPRAS ── */
              ) : aba==='compras' ? (
                <>
                  <div style={{display:'flex',justifyContent:'flex-end'}}>
                    <button className="cf-btn cf-btn-primary" style={{fontSize:12}} onClick={onNovaCompra}><Ic d={ICONS.plus} size={13}/> Nova compra</button>
                  </div>
                  {d.compras.length===0
                    ?<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)',fontSize:13}}>Nenhuma compra registrada</div>
                    :d.compras.map(c=>{
                      const pillCls=c.status_pag==='pago'?'ok':c.vencido?'crit':'warn';
                      const pillLbl=c.status_pag==='pago'?'✓ PAGO':c.vencido?'VENCIDO':c.status_pag==='parcelado'?'PARCELADO':'EM ABERTO';
                      return (
                        <div className="pk-compra" key={c.id}>
                          <div className="pk-compra-h" onClick={()=>toggle(c.id)}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:7}}>
                                <span className={`cf-pill ${pillCls}`} style={{fontSize:9}}>{pillLbl}</span>
                                {c.saldo>0&&<span style={{fontSize:10.5,fontFamily:'var(--font-mono)',color:'var(--warn)'}}>falta {pkBRL(c.saldo)}</span>}
                              </div>
                              <div style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-muted)',marginTop:4}}>{c.criado_em} · vence {c.vencimento}</div>
                            </div>
                            <div className="pk-compra-total">{pkBRL(c.valor_total)}</div>
                            <span className={`pk-compra-chev${openCompra[c.id]?' open':''}`}>▼</span>
                          </div>
                          {openCompra[c.id]&&(
                            <div className="pk-compra-body">
                              <div>
                                <div className="pk-subhead">Produtos</div>
                                {(c.itens||[]).map((it,i)=>(
                                  <div className="pk-item" key={i}>
                                    <span className="pk-item-n">{txt(it.produto)}</span>
                                    <span style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:11}}>{it.quantidade}× {pkBRL(it.preco_unitario)}</span>
                                    <span style={{fontFamily:'var(--font-mono)',fontWeight:700}}>{pkBRL(it.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <div className="pk-subhead">
                                  Repasses
                                  {c.saldo>0&&<button className="cf-btn" style={{padding:'4px 10px',fontSize:11,borderRadius:7}} onClick={()=>onRepasse(parceira,c)}>+ Repasse</button>}
                                </div>
                                {(c.repasses||[]).length===0
                                  ?<div style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>Nenhum repasse</div>
                                  :(c.repasses||[]).map(r=>(
                                    <div className="pk-repasse" key={r.id}>
                                      <span className="pk-repasse-d">{r.data}{r.observacao?` · ${r.observacao}`:''}</span>
                                      <span className="pk-repasse-v">{pkBRL(r.valor)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>

              /* ── ABA CLIENTES ── */
              ) : (
                <>
                  {/* Botão adicionar cliente */}
                  {!addCli ? (
                    <button className="cf-btn cf-btn-primary" style={{alignSelf:'flex-start'}} onClick={()=>{setAddCli(true);setAddErr('');}}>
                      <Ic d={ICONS.plus} size={14}/> Adicionar cliente
                    </button>
                  ) : (
                    <div style={{background:'var(--surface-2)',border:'1px solid var(--brand-line)',borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--brand)',fontFamily:'var(--font-mono)',letterSpacing:'.08em'}}>NOVA CLIENTE</div>
                      {addErr&&<div className="pk-err">⚠ {addErr}</div>}
                      <div className="pk-row2">
                        <div className="pk-fld"><label className="pk-fld-l">Nome *</label><input className="pk-inp" autoFocus placeholder="Nome completo" value={novoNome} onChange={e=>setNovoNome(e.target.value)}/></div>
                        <div className="pk-fld"><label className="pk-fld-l">Telefone</label><input className="pk-inp" placeholder="(11) 99999-9999" value={novoTel} onChange={e=>setNovoTel(e.target.value)}/></div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="cf-btn cf-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>{setAddCli(false);setAddErr('');}}>Cancelar</button>
                        <button className="cf-btn cf-btn-primary" style={{flex:2,justifyContent:'center'}} disabled={addSaving} onClick={salvarCli}>{addSaving?'Salvando...':'Confirmar'}</button>
                      </div>
                    </div>
                  )}

                  {/* Lista de clientes */}
                  {(d.clientes||[]).length===0 ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)',fontSize:13}}>
                      Nenhuma cliente vinculada ainda.<br/>
                      <span style={{fontSize:11,fontFamily:'var(--font-mono)'}}>Adicione a primeira cliente acima.</span>
                    </div>
                  ) : (d.clientes||[]).map(c=>(
                    <div className="pk-cli-row" key={c.id}>
                      <div className="pk-cli-av" style={{background:cor(c.nome)}}>{pkInit(c.nome)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="pk-cli-name">{c.nome}</div>
                        <div className="pk-cli-tel">{pkTel(c.telefone)}</div>
                      </div>
                      {(c.saldo_em_aberto||0)>0
                        ?<span className="cf-pill warn" style={{fontSize:9}}>{pkBRL(c.saldo_em_aberto)}</span>
                        :<span className="cf-pill ok" style={{fontSize:9}}>em dia</span>}
                      {/* Botão nova venda */}
                      <button className="cf-icon-btn" title="Nova venda para esta cliente"
                        style={{width:30,height:30,background:'color-mix(in oklab,var(--ok) 12%,transparent)',color:'var(--ok)',borderColor:'color-mix(in oklab,var(--ok) 25%,transparent)'}}
                        onClick={()=>onVendaCli(parceira,c)}>
                        <Ic d={ICONS.dollar} size={14}/>
                      </button>
                      {/* WhatsApp */}
                      {c.telefone&&(
                        <a className="cf-icon-btn" href={pkWa(c.telefone)} target="_blank" rel="noreferrer" title="WhatsApp"
                          style={{textDecoration:'none',width:30,height:30,background:'color-mix(in oklab,#25d366 10%,transparent)',color:'#25d366',borderColor:'color-mix(in oklab,#25d366 22%,transparent)'}}>
                          <IcoWa size={13}/>
                        </a>
                      )}
                      {/* Remover */}
                      <button className="cf-icon-btn danger" title="Remover cliente" style={{width:30,height:30}} onClick={()=>onDeletarCli(parceira.id,c.id)}>
                        <Ic d={ICONS.trash} size={14}/>
                      </button>
                    </div>
                  ))}
                </>
              )
            )}
          </div>

          {/* Footer */}
          <div className="pk-det-foot">
            {confirmDel ? (
              <>
                <span style={{flex:1,display:'flex',alignItems:'center',fontSize:12,color:'var(--crit)',fontWeight:600}}>Excluir {parceira.nome}?</span>
                <button className="cf-btn cf-btn-ghost" onClick={()=>setConfirmDel(false)}>Cancelar</button>
                <button className="cf-btn cf-btn-danger" onClick={async()=>{await onDeletarParceira(parceira.id);setConfirmDel(false);}}>Confirmar exclusão</button>
              </>
            ) : (
              <>
                {parceira.saldo_em_aberto>0 ? (
                  <button className="cf-btn cf-btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>onRepasse(parceira,null)}>
                    <Ic d={ICONS.arrowIn} size={14}/> Registrar repasse
                  </button>
                ) : (
                  <span style={{flex:1,display:'flex',alignItems:'center',fontSize:12,color:'var(--ok)',fontFamily:'var(--font-mono)'}}>✓ Conta em dia</span>
                )}
                <button className="cf-btn cf-btn-ghost" onClick={onNovaCompra}><Ic d={ICONS.plus} size={13}/> Nova compra</button>
                <button className="cf-icon-btn danger" title="Excluir parceira" onClick={()=>setConfirmDel(true)}><Ic d={ICONS.trash} size={14}/></button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}


/* ── Modal base ───────────────────────────────────────────────────────── */
function ModalBase({title, subtitle, ic, onClose, children, footer, theme, wide}) {
  return (
    <Portal theme={theme}>
      <div className="pk-mbg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className={`pk-modal${wide?' pk-modal-lg':''}`}>
          <div className="pk-mhead">
            <div>
              <div className="pk-mtitle"><span className="pk-mtitle-ic">{ic}</span>{title}</div>
              {subtitle&&<div className="pk-msub" style={{marginLeft:39}}>{subtitle}</div>}
            </div>
            <button className="cf-icon-btn" onClick={onClose}><Ic d={ICONS.x} size={14}/></button>
          </div>
          <div className="pk-mbody">{children}</div>
          {footer&&<div className="pk-mfoot">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/* ── Modal Nova Parceira ──────────────────────────────────────────────── */
function NovaParceiraModal({onClose, onSaved, theme}) {
  const [f,setF] = useState({nome:'',telefone:'',email:'',cidade:'',observacao:''});
  const [err,setErr] = useState(''); const [saving,setSaving] = useState(false);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const salvar=async()=>{
    if(!f.nome.trim()){setErr('Nome é obrigatório.');return;}
    setSaving(true);
    try{ const r=await api.post('/parceiras',{nome:f.nome.trim(),telefone:f.telefone,email:f.email,cidade:f.cidade,observacao:f.observacao}); onSaved(r); }
    catch(e){setErr(e.message);}
    finally{setSaving(false);}
  };
  return (
    <ModalBase title="Nova parceira" ic={<Ic d={ICONS.users} size={15}/>} onClose={onClose} theme={theme}
      footer={<><button className="cf-btn cf-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancelar</button><button className="cf-btn cf-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={salvar} disabled={saving}>{saving?'Salvando...':'Cadastrar'}</button></>}>
      {err&&<div className="pk-err">⚠ {err}</div>}
      <div className="pk-fld"><label className="pk-fld-l">Nome *</label><input className="pk-inp" autoFocus value={f.nome} onChange={e=>set('nome',e.target.value)} placeholder="Nome da parceira"/></div>
      <div className="pk-row2">
        <div className="pk-fld"><label className="pk-fld-l">Telefone</label><input className="pk-inp" value={f.telefone} onChange={e=>set('telefone',e.target.value)} placeholder="(11) 99999-9999"/></div>
        <div className="pk-fld"><label className="pk-fld-l">Cidade</label><input className="pk-inp" value={f.cidade} onChange={e=>set('cidade',e.target.value)} placeholder="Cidade"/></div>
      </div>
      <div className="pk-fld"><label className="pk-fld-l">Email</label><input className="pk-inp" type="email" value={f.email} onChange={e=>set('email',e.target.value)} placeholder="email@exemplo.com"/></div>
    </ModalBase>
  );
}

/* ── Modal Repasse ────────────────────────────────────────────────────── */
function RepasseModal({parceira, compra, onClose, onSaved, theme}) {
  const comprasAberto = (parceira.compras||[]).filter(c=>c.saldo>0);
  const [compraId,setCompraId] = useState(compra?compra.id:(comprasAberto[0]?.id||''));
  const [valor,setValor] = useState(''); const [obs,setObs] = useState('PIX');
  const [err,setErr] = useState(''); const [saving,setSaving] = useState(false);
  const alvo = (parceira.compras||[]).find(c=>c.id===Number(compraId));
  const salvar=async()=>{
    const v=parseFloat(valor)||0;
    if(!alvo){setErr('Selecione uma compra.');return;}
    if(v<=0){setErr('Informe um valor válido.');return;}
    setSaving(true);
    try{ const r=await api.post(`/parceiras/${parceira.id}/compras/${alvo.id}/repasses`,{valor:v,observacao:obs}); onSaved(r); }
    catch(e){setErr(e.message);}
    finally{setSaving(false);}
  };
  return (
    <ModalBase title="Registrar repasse" subtitle={parceira.nome} ic={<Ic d={ICONS.arrowIn} size={15}/>} onClose={onClose} theme={theme}
      footer={<><button className="cf-btn cf-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancelar</button><button className="cf-btn cf-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={salvar} disabled={saving}>{saving?'Salvando...':'Confirmar repasse'}</button></>}>
      {err&&<div className="pk-err">⚠ {err}</div>}
      <div className="pk-fld"><label className="pk-fld-l">Compra</label>
        <select className="pk-sel" value={compraId} onChange={e=>setCompraId(e.target.value)}>
          {comprasAberto.map(c=><option key={c.id} value={c.id}>{c.criado_em} · saldo {pkBRL(c.saldo)}</option>)}
        </select>
      </div>
      {alvo&&<div style={{display:'flex',justifyContent:'space-between',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'10px 13px',fontSize:12}}>
        <span style={{color:'var(--text-muted)'}}>Saldo desta compra</span>
        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--warn)'}}>{pkBRL(alvo.saldo)}</span>
      </div>}
      <div className="pk-row2">
        <div className="pk-fld"><label className="pk-fld-l">Valor (R$)</label><input className="pk-inp big" type="number" min="0" step="0.01" autoFocus placeholder="0,00" value={valor} onChange={e=>setValor(e.target.value)}/></div>
        <div className="pk-fld"><label className="pk-fld-l">Forma</label><select className="pk-sel" value={obs} onChange={e=>setObs(e.target.value)}>{MODOS.map(m=><option key={m}>{m}</option>)}</select></div>
      </div>
      {alvo&&parseFloat(valor)>0&&<div style={{background:'var(--brand-soft)',border:'1px solid var(--brand-line)',borderRadius:'var(--radius-sm)',padding:'10px 14px',display:'flex',justifyContent:'space-between',fontSize:12.5}}>
        <span style={{color:'var(--text-dim)'}}>Saldo após repasse</span>
        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--brand)'}}>{pkBRL(Math.max(alvo.saldo-(parseFloat(valor)||0),0))}</span>
      </div>}
    </ModalBase>
  );
}

/* ── Modal Venda para Cliente da Parceira ─────────────────────────────── */
function VendaClienteModal({parceira, cliente, produtos, onClose, onSaved, theme}) {
  const [modo,setModo] = useState('produto');
  const [valorLivre,setValorLivre] = useState(''); const [descLivre,setDescLivre] = useState('');
  const [itens,setItens] = useState([]); const [prodBusca,setProdBusca] = useState(''); const [prodDrop,setProdDrop] = useState(false);
  const [pagamento,setPagamento] = useState('PIX'); const [entrada,setEntrada] = useState('');
  const [parcelado,setParcelado] = useState(false); const [numParc,setNumParc] = useState(2); const [vencimento,setVencimento] = useState('');
  const [err,setErr] = useState(''); const [saving,setSaving] = useState(false);
  const prodFiltrados = prodBusca.length>=1?produtos.filter(p=>(p.nome||'').toLowerCase().includes(prodBusca.toLowerCase())).slice(0,8):[];
  const addItem=p=>{ setItens(prev=>{const ex=prev.find(i=>i.produto_id===p.id);if(ex)return prev.map(i=>i.produto_id===p.id?{...i,quantidade:i.quantidade+1}:i);return[...prev,{produto_id:p.id,nome:p.nome,preco:p.preco_venda,quantidade:1}];}); setProdBusca('');setProdDrop(false); };
  const updQty=(id,q)=>setItens(prev=>prev.map(i=>i.produto_id===id?{...i,quantidade:Math.max(1,q)}:i));
  const delItem=id=>setItens(prev=>prev.filter(i=>i.produto_id!==id));
  const subtotal=modo==='livre'?(parseFloat(valorLivre)||0):itens.reduce((a,i)=>a+i.preco*i.quantidade,0);
  const ent=Math.min(parseFloat(entrada)||0,subtotal); const restante=Math.max(subtotal-ent,0);
  const valParc=parcelado&&numParc>1&&restante>0?restante/numParc:null;
  const salvar=async()=>{
    if(modo==='produto'&&itens.length===0){setErr('Adicione ao menos 1 produto.');return;}
    if(modo==='livre'&&(!valorLivre||parseFloat(valorLivre)<=0)){setErr('Informe o valor.');return;}
    setSaving(true); setErr('');
    try{
      // se a cliente não tem vínculo com cliente real, cria automaticamente
      let cid = cliente.cliente_id;
      if(!cid){
        const vinc = await api.post(`/parceiras/${parceira.id}/clientes/${cliente.id}/vincular`, {});
        cid = vinc.cliente_id;
      }
      const payload={
        cliente_id:cid,
        itens:modo==='produto'?itens.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,preco_unitario:i.preco,desconto_item:0})):[],
        modo_pagamento:pagamento, parcelado, num_parcelas:parseInt(numParc)||1,
        data_vencimento:vencimento||null, valor_entrada:ent,
        desconto_geral:0,
        ...(modo==='livre'&&{valor_livre:parseFloat(valorLivre),descricao_livre:descLivre||'Venda avulsa'}),
      };
      const r=await api.post('/vendas/unificada',payload);
      onSaved(r);
    }catch(e){setErr(e.message);}
    finally{setSaving(false);}
  };
  return (
    <ModalBase title="Nova venda" subtitle={`${cliente.nome} · carteira de ${parceira.nome.split(' ')[0]}`}
      ic={<Ic d={ICONS.dollar} size={15}/>} onClose={onClose} theme={theme} wide
      footer={<><button className="cf-btn cf-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancelar</button><button className="cf-btn cf-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={salvar} disabled={saving}>{saving?'Salvando...':'Confirmar venda'}</button></>}>
      {err&&<div className="pk-err">⚠ {err}</div>}
      <div className="pk-toggle-modo">
        <button className={`pk-toggle-btn${modo==='produto'?' on-prod':''}`} onClick={()=>setModo('produto')}>📦 Produto do catálogo</button>
        <button className={`pk-toggle-btn${modo==='livre'?' on-livre':''}`} onClick={()=>setModo('livre')}>✏ Valor livre</button>
      </div>
      {modo==='livre'?(
        <>
          <div className="pk-fld"><label className="pk-fld-l">Descrição</label><input className="pk-inp" placeholder="Ex: kit perfumaria, serviço…" value={descLivre} onChange={e=>setDescLivre(e.target.value)}/></div>
          <div className="pk-fld"><label className="pk-fld-l">Valor (R$)</label><input className="pk-inp big" type="number" min="0.01" step="0.01" placeholder="0,00" value={valorLivre} onChange={e=>setValorLivre(e.target.value)}/></div>
        </>
      ):(
        <div className="pk-fld">
          <label className="pk-fld-l">Produtos</label>
          <div style={{position:'relative'}}>
            <input className="pk-inp" placeholder="Buscar produto…" value={prodBusca} onChange={e=>{setProdBusca(e.target.value);setProdDrop(true);}} onFocus={()=>setProdDrop(true)}/>
            {prodDrop&&prodFiltrados.length>0&&(
              <div className="pk-prod-drop">
                {prodFiltrados.map(p=>(
                  <div key={p.id} className="pk-prod-opt" onClick={()=>addItem(p)}>
                    <span>{p.nome}</span>
                    <strong style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{pkBRL(p.preco_venda)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          {itens.length>0&&<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
            {itens.map(i=>(
              <div key={i.produto_id} className="pk-item-row">
                <div style={{flex:1,fontSize:13,fontWeight:600}}>{i.nome}</div>
                <button className="pk-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade-1)}>−</button>
                <span style={{fontFamily:'var(--font-mono)',minWidth:22,textAlign:'center'}}>{i.quantidade}</span>
                <button className="pk-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade+1)}>+</button>
                <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--ok)',minWidth:78,textAlign:'right'}}>{pkBRL(i.preco*i.quantidade)}</span>
                <button className="pk-qty-btn" style={{borderColor:'transparent',color:'var(--crit)'}} onClick={()=>delItem(i.produto_id)}>×</button>
              </div>
            ))}
          </div>}
        </div>
      )}
      <div className="pk-row2">
        <div className="pk-fld"><label className="pk-fld-l">Pagamento</label><select className="pk-sel" value={pagamento} onChange={e=>setPagamento(e.target.value)}>{MODOS.map(m=><option key={m}>{m}</option>)}</select></div>
        <div className="pk-fld"><label className="pk-fld-l">Entrada (R$)</label><input className="pk-inp" type="number" min="0" step="0.01" placeholder="0,00" value={entrada} onChange={e=>setEntrada(e.target.value)}/></div>
      </div>
      <div className="pk-row2">
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'var(--text-dim)',alignSelf:'center'}}>
          <input type="checkbox" checked={parcelado} onChange={e=>setParcelado(e.target.checked)} style={{accentColor:'var(--brand)',width:15,height:15}}/> Parcelar
        </label>
        {parcelado&&<div className="pk-fld"><label className="pk-fld-l">Nº parcelas</label><select className="pk-sel" value={numParc} onChange={e=>setNumParc(e.target.value)}>{[2,3,4,5,6,7,8,9,10,12].map(n=><option key={n} value={n}>{n}x</option>)}</select></div>}
      </div>
      {(pagamento==='Fiado'||parcelado||pagamento==='Boleto')&&<div className="pk-fld"><label className="pk-fld-l">Vencimento</label><input className="pk-inp" type="date" value={vencimento} onChange={e=>setVencimento(e.target.value)}/></div>}
      {subtotal>0&&(
        <div className="pk-totais">
          <div className="pk-tot-row" style={{fontSize:16,fontWeight:800}}><span>Total</span><span style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{pkBRL(subtotal)}</span></div>
          {ent>0&&<><div className="pk-tot-row"><span style={{color:'var(--ok)'}}>Entrada</span><span style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>− {pkBRL(ent)}</span></div>
          <div className="pk-tot-row" style={{fontWeight:700}}><span>Restante</span><span style={{fontFamily:'var(--font-mono)',color:'var(--warn)'}}>{pkBRL(restante)}</span></div></>}
          {valParc&&<div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)',textAlign:'right'}}>{numParc}x de {pkBRL(valParc)}</div>}
        </div>
      )}
    </ModalBase>
  );
}

/* ── Modal Nova Compra da Parceira ────────────────────────────────────── */
function NovaCompraModal({parceira, produtos, onClose, onSaved, theme}) {
  const [itens,setItens] = useState([]); const [prodBusca,setProdBusca] = useState(''); const [prodDrop,setProdDrop] = useState(false);
  const [statusPag,setStatusPag] = useState('em_aberto'); const [obs,setObs] = useState('');
  const [err,setErr] = useState(''); const [saving,setSaving] = useState(false);
  const prodFiltrados = prodBusca.length>=1?produtos.filter(p=>(p.nome||'').toLowerCase().includes(prodBusca.toLowerCase())).slice(0,8):[];
  const addItem=p=>{ setItens(prev=>{const ex=prev.find(i=>i.produto_id===p.id);if(ex)return prev.map(i=>i.produto_id===p.id?{...i,quantidade:i.quantidade+1}:i);return[...prev,{produto_id:p.id,nome:p.nome,preco:p.preco_custo||p.preco_venda,quantidade:1}];}); setProdBusca('');setProdDrop(false); };
  const updQty=(id,q)=>setItens(prev=>prev.map(i=>i.produto_id===id?{...i,quantidade:Math.max(1,q)}:i));
  const delItem=id=>setItens(prev=>prev.filter(i=>i.produto_id!==id));
  const total=itens.reduce((a,i)=>a+i.preco*i.quantidade,0);
  const salvar=async()=>{
    if(itens.length===0){setErr('Adicione ao menos 1 produto.');return;}
    setSaving(true); setErr('');
    try{ const r=await api.post(`/parceiras/${parceira.id}/compras`,{itens:itens.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,preco_unitario:i.preco})),status_pag:statusPag,observacao:obs}); onSaved(r); }
    catch(e){setErr(e.message);}
    finally{setSaving(false);}
  };
  return (
    <ModalBase title="Nova compra" subtitle={parceira.nome} ic={<Ic d={ICONS.arrowOut} size={15}/>} onClose={onClose} theme={theme} wide
      footer={<><button className="cf-btn cf-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancelar</button><button className="cf-btn cf-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={salvar} disabled={saving}>{saving?'Salvando...':'Registrar compra'}</button></>}>
      {err&&<div className="pk-err">⚠ {err}</div>}
      <div className="pk-fld">
        <label className="pk-fld-l">Produtos</label>
        <div style={{position:'relative'}}>
          <input className="pk-inp" placeholder="Buscar produto…" value={prodBusca} onChange={e=>{setProdBusca(e.target.value);setProdDrop(true);}} onFocus={()=>setProdDrop(true)}/>
          {prodDrop&&prodFiltrados.length>0&&(
            <div className="pk-prod-drop">
              {prodFiltrados.map(p=>(
                <div key={p.id} className="pk-prod-opt" onClick={()=>addItem(p)}>
                  <span>{p.nome}</span>
                  <strong style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{pkBRL(p.preco_custo||p.preco_venda)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        {itens.length>0&&<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
          {itens.map(i=>(
            <div key={i.produto_id} className="pk-item-row">
              <div style={{flex:1,fontSize:13,fontWeight:600}}>{i.nome}</div>
              <button className="pk-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade-1)}>−</button>
              <span style={{fontFamily:'var(--font-mono)',minWidth:22,textAlign:'center'}}>{i.quantidade}</span>
              <button className="pk-qty-btn" onClick={()=>updQty(i.produto_id,i.quantidade+1)}>+</button>
              <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--ok)',minWidth:78,textAlign:'right'}}>{pkBRL(i.preco*i.quantidade)}</span>
              <button className="pk-qty-btn" style={{borderColor:'transparent',color:'var(--crit)'}} onClick={()=>delItem(i.produto_id)}>×</button>
            </div>
          ))}
        </div>}
      </div>
      <div className="pk-row2">
        <div className="pk-fld"><label className="pk-fld-l">Status de pagamento</label>
          <select className="pk-sel" value={statusPag} onChange={e=>setStatusPag(e.target.value)}>
            <option value="em_aberto">Em aberto</option><option value="parcelado">Parcelado</option><option value="pago">Pago</option>
          </select>
        </div>
        <div className="pk-fld"><label className="pk-fld-l">Observação</label><input className="pk-inp" placeholder="Opcional…" value={obs} onChange={e=>setObs(e.target.value)}/></div>
      </div>
      {total>0&&<div className="pk-totais"><div className="pk-tot-row" style={{fontSize:16,fontWeight:800}}><span>Total</span><span style={{fontFamily:'var(--font-mono)',color:'var(--ok)'}}>{pkBRL(total)}</span></div></div>}
    </ModalBase>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Parceiras() {
  const [params] = useSearchParams();
  const [theme, setTheme] = useState(getDocTheme);
  const [parceiras, setParceiras] = useState([]);
  const [produtos,  setProdutos]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [detalhe,   setDetalhe]   = useState(null);
  const [loadingDet,setLoadingDet]= useState(false);
  const [view,      setView]      = useState('rede');
  const [search,    setSearch]    = useState('');
  const [activeSeg, setActiveSeg] = useState(null);
  const [sort,      setSort]      = useState('deve');
  const [treeOpen,  setTreeOpen]  = useState({});
  const [toast,     setToast]     = useState(null);
  const [modalNova,     setModalNova]     = useState(false);
  const [modalRepasse,  setModalRepasse]  = useState(null); // {parceira, compra}
  const [modalVenda,    setModalVenda]    = useState(null); // {parceira, cliente}
  const [modalCompra,   setModalCompra]   = useState(null); // {parceira}

  const showToast = useCallback((msg,type='ok')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3200); },[]);

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    const onKey=e=>{ if(e.key==='Escape'){setModalNova(false);setModalRepasse(null);setModalVenda(null);setModalCompra(null);} };
    window.addEventListener('keydown',onKey);
    return()=>{ obs.disconnect(); window.removeEventListener('keydown',onKey); };
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const [p,pr]=await Promise.allSettled([api.get('/parceiras'),api.get('/produtos')]);
      if(p.status==='fulfilled')  setParceiras(Array.isArray(p.value)?p.value:[]);
      if(pr.status==='fulfilled') setProdutos(Array.isArray(pr.value)?pr.value:[]);
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{ load(); },[load]);

  const loadDetalhe = useCallback(async(id)=>{
    setLoadingDet(true);
    try{ const d=await api.get(`/parceiras/${id}`); setDetalhe(d); }
    catch(e){ console.error(e); }
    finally{ setLoadingDet(false); }
  },[]);

  useEffect(()=>{ if(selected) loadDetalhe(selected.id); else setDetalhe(null); },[selected,loadDetalhe]);
  useEffect(()=>{ if(params.get('novo')==='1') setModalNova(true); },[]);

  const filtered = useMemo(()=>{
    const q=search.trim().toLowerCase();
    let list=parceiras.filter(p=>!q||p.nome.toLowerCase().includes(q)||(p.cidade||'').toLowerCase().includes(q)||(p.telefone||'').includes(q));
    if(activeSeg) list=list.filter(p=>p.status===activeSeg);
    return list;
  },[parceiras,search,activeSeg]);

  const sorted = useMemo(()=>{
    const arr=[...filtered];
    if(sort==='deve')     arr.sort((a,b)=>b.saldo_em_aberto-a.saldo_em_aberto);
    else if(sort==='status')   arr.sort((a,b)=>(PK_RANK[b.status]||0)-(PK_RANK[a.status]||0)||b.saldo_em_aberto-a.saldo_em_aberto);
    else if(sort==='clientes') arr.sort((a,b)=>(b.num_clientes||0)-(a.num_clientes||0));
    else if(sort==='receber')  arr.sort((a,b)=>(b.vendas_resumo?.saldo_receber||0)-(a.vendas_resumo?.saldo_receber||0));
    else if(sort==='nome')     arr.sort((a,b)=>a.nome.localeCompare(b.nome));
    return arr;
  },[filtered,sort]);

  /* handlers API */
  const handleNovaParceira = async(r)=>{ setModalNova(false); showToast('Parceira cadastrada!'); await load(); };
  const handleRepasse = async(r)=>{ setModalRepasse(null); showToast(`Repasse de ${pkBRL(r.valor||0)} registrado!`); await load(); if(selected) await loadDetalhe(selected.id); };
  const handleVendaCli = async(r)=>{ setModalVenda(null); showToast('Venda registrada! Aparece em Vendas e Relatórios.'); await load(); if(selected) await loadDetalhe(selected.id); };
  const handleNovaCompra = async(r)=>{ setModalCompra(null); showToast(`Compra registrada! Total: ${pkBRL(r.total||0)}`); await load(); if(selected) await loadDetalhe(selected.id); };
  const handleDeletarCli = async(pid,cid)=>{
    try{ await api.del(`/parceiras/${pid}/clientes/${cid}`); showToast('Cliente removida'); await loadDetalhe(pid); }
    catch(e){ showToast(e.message,'err'); }
  };
  const handleAdicionarCli = async(pid, dados) => {
    const r = await api.post(`/parceiras/${pid}/clientes`, dados);
    await loadDetalhe(pid);
    await load();
    showToast(`${dados.nome} adicionada!`);
    return r;
  };

  const handleDeletarParceira = async(pid)=>{
    try{ await api.del(`/parceiras/${pid}`); showToast('Parceira removida','err'); setSelected(null); await load(); }
    catch(e){ showToast(e.message,'err'); }
  };

  return (
    <div className="pk-root" data-theme={theme}>
      <style>{S}</style>
      <div className="pk-page">

        {/* Cabeçalho */}
        <div className="pk-head">
          <div>
            <div className="pk-head-title">Parceiras</div>
            <div className="pk-head-sub">Rede de revendedoras e suas clientes</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={()=>setModalNova(true)}>
            <Ic d={ICONS.plus} size={15}/> Nova parceira
          </button>
        </div>

        {/* KPIs */}
        {loading?<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="pk-skel" style={{height:100}}/>)}</div>:<KpiStrip parceiras={parceiras}/>}

        {/* Pulse Bar */}
        {!loading&&parceiras.length>0&&<PulseBar parceiras={parceiras} activeSeg={activeSeg} onSeg={setActiveSeg}/>}

        {/* Controles */}
        <div className="pk-controls">
          <div className="pk-search">
            <Ic d={ICONS.search} size={15}/>
            <input placeholder="Buscar parceira, cidade ou telefone…" value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:17}}>×</button>}
          </div>
          <select className="pk-sort" value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="deve">Ordenar: maior débito</option>
            <option value="status">Ordenar: prioridade</option>
            <option value="receber">Ordenar: a receber</option>
            <option value="clientes">Ordenar: mais clientes</option>
            <option value="nome">Ordenar: nome A-Z</option>
          </select>
          <div className="pk-view-toggle">
            {[{id:'rede',ic:'grid',lbl:'Rede'},{id:'tree',ic:'layers',lbl:'Árvore'},{id:'lista',ic:'chart',lbl:'Lista'}].map(v=>(
              <button key={v.id} className={`pk-view-btn${view===v.id?' active':''}`} onClick={()=>setView(v.id)}>
                <Ic d={ICONS[v.ic]} size={14}/> {v.lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Views */}
        {loading?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
            {[1,2,3].map(i=><div key={i} className="pk-skel" style={{height:220}}/>)}
          </div>
        ):sorted.length===0?(
          <div className="pk-empty">
            <div className="pk-empty-icon">◯</div>
            <div style={{fontSize:14,fontWeight:600}}>Nenhuma parceira encontrada</div>
            <div style={{fontSize:12,fontFamily:'var(--font-mono)',marginTop:5}}>{search?'Tente outro termo':'Ajuste os filtros'}</div>
          </div>
        ):view==='rede'?(
          <RedeView parceiras={sorted} onOpen={setSelected} onRepasse={(p,c)=>setModalRepasse({parceira:p,compra:c})} theme={theme}/>
        ):view==='tree'?(
          <TreeView parceiras={sorted} onOpen={setSelected} openMap={treeOpen} onToggle={id=>setTreeOpen(o=>({...o,[id]:!o[id]}))}/>
        ):(
          <ListView parceiras={sorted} onOpen={setSelected} onRepasse={(p,c)=>setModalRepasse({parceira:p,compra:c})} sort={sort} setSort={setSort}/>
        )}
      </div>

      {/* Drawer de detalhe */}
      {selected&&(
        <PartnerModal
          parceira={selected} detalhe={detalhe} loadingDetalhe={loadingDet} theme={theme}
          onClose={()=>setSelected(null)}
          onRepasse={(p,c)=>setModalRepasse({parceira:p,compra:c})}
          onVendaCli={(p,c)=>setModalVenda({parceira:p,cliente:c})}
          onNovaCompra={()=>setModalCompra({parceira:selected})}
          onDeletarCli={handleDeletarCli}
          onAdicionarCli={handleAdicionarCli}
          onDeletarParceira={handleDeletarParceira}
        />
      )}

      {/* Modais via Portal */}
      {modalNova&&<NovaParceiraModal onClose={()=>setModalNova(false)} onSaved={handleNovaParceira} theme={theme}/>}
      {modalRepasse&&<RepasseModal parceira={modalRepasse.parceira} compra={modalRepasse.compra} onClose={()=>setModalRepasse(null)} onSaved={handleRepasse} theme={theme}/>}
      {modalVenda&&<VendaClienteModal parceira={modalVenda.parceira} cliente={modalVenda.cliente} produtos={produtos} onClose={()=>setModalVenda(null)} onSaved={handleVendaCli} theme={theme}/>}
      {modalCompra&&<NovaCompraModal parceira={modalCompra.parceira} produtos={produtos} onClose={()=>setModalCompra(null)} onSaved={handleNovaCompra} theme={theme}/>}

      {/* Toast */}
      {toast&&(
        <div className="pk-toast">
          <span className={`pk-toast-ic${toast.type==='err'?' err':''}`}>{toast.type==='err'?'✕':'✓'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}