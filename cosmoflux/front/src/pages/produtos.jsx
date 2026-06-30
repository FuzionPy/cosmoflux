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
const fmtBRLp = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const margemPct = (p) => p.custo > 0 ? ((p.venda - p.custo) / p.custo) * 100 : 0;
const statusOf = (p) => p.estoque === 0 ? 'esgotado' : p.estoque <= p.minimo ? 'baixo' : 'ok';
const ST_META = {
  ok:       { cls: 'ok',   label: 'Em estoque' },
  baixo:    { cls: 'warn', label: 'Estoque baixo' },
  esgotado: { cls: 'crit', label: 'Esgotado' },
};
const meterCls = (s) => s === 'esgotado' ? 'crit' : s === 'baixo' ? 'warn' : 'ok';
const catColor = (i) => `var(--cat-${((i % 5) + 5) % 5})`;

// normaliza o produto do backend (preco_venda/estoque_atual/...) para os nomes
// curtos que o design usa (venda/estoque/...) — mantém id e categoria_id reais
const fromApi = (p) => ({
  id: p.id, nome: p.nome, sku: p.sku || '—', unidade: p.unidade || 'un',
  venda: Number(p.preco_venda || 0), custo: Number(p.preco_custo || 0),
  estoque: Number(p.estoque_atual || 0), minimo: Number(p.estoque_minimo || 5),
  categoria: p.categoria || 'Sem categoria', categoria_id: p.categoria_id ?? null,
  descricao: p.descricao || '',
});
// monta o payload que o backend espera (ProdutoSchema completo) a partir do form
const toApi = (form, categoriaId) => ({
  nome: form.nome.trim(),
  sku: form.sku.trim() || null,
  unidade: form.unidade,
  preco_venda: parseFloat(form.venda) || 0,
  preco_custo: parseFloat(form.custo) || 0,
  estoque_atual: parseInt(form.estoque) || 0,
  estoque_minimo: parseInt(form.minimo) || 5,
  categoria_id: categoriaId,
  descricao: form.descricao.trim() || null,
});

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
  minus:  <path d="M5 12h14"/>,
  plus:   <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  list:   <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  sort:   <><path d="M3 6h12M3 12h9M3 18h6"/><path d="m18 9 3-3-3-3M21 6v12"/></>,
  box:    <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>,
  tag:    <><path d="M20.59 13.41 11 23l-9-9 9.59-9.59a2 2 0 0 1 1.41-.41H20a2 2 0 0 1 2 2v6.18a2 2 0 0 1-.41 1.41Z"/><circle cx="16.5" cy="7.5" r="1.5"/></>,
  bell:   <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  spark:  <><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/></>,
  chart:  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  x:      <><path d="M18 6L6 18M6 6l12 12"/></>,
};

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-prod-root *,.cf-prod-root *::before,.cf-prod-root *::after{box-sizing:border-box;}
.cf-prod-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--kpi-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cfpIn .3s ease both;}
@keyframes cfpIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-prod-root[data-theme="dark"],.cf-prod-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);
  --cat-0:#9166d8;--cat-1:#3b82f6;--cat-2:#21a06d;--cat-3:#e08a2a;--cat-4:#c75c8a;}
.cf-prod-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);
  --cat-0:#9166d8;--cat-1:#3b82f6;--cat-2:#1a8a5d;--cat-3:#c8770f;--cat-4:#b3577f;}
.cf-prod-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-prod-portal{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.cf-prod-portal[data-theme="dark"],.cf-prod-portal:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-prod-portal[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-prod-portal{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}
.cf-prod-portal *,.cf-prod-portal *::before,.cf-prod-portal *::after{box-sizing:border-box;}

.cf-prod { display: flex; flex-direction: column; gap: var(--gap); max-width: 1480px; margin: 0 auto; }

.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cf-btn:hover{border-color:var(--border-strong);}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover{filter:brightness(1.08);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-btn.sm{padding:7px 12px;font-size:12px;}
.cf-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-mclose{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.cf-mclose:hover{color:var(--crit);border-color:color-mix(in oklab,var(--crit) 35%,transparent);}
.cf-att-pulse{width:9px;height:9px;border-radius:50%;background:var(--crit);flex-shrink:0;animation:cfpPulse 1.8s infinite;}
@keyframes cfpPulse{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--crit) 60%,transparent);}70%{box-shadow:0 0 0 7px transparent;}100%{box-shadow:0 0 0 0 transparent;}}

.cf-pd-alert{display:flex;align-items:center;gap:12px;padding:13px 18px;background:color-mix(in oklab,var(--crit) 10%,var(--surface));border:1px solid color-mix(in oklab,var(--crit) 32%,transparent);border-radius:var(--radius);}
.cf-pd-alert-txt{font-size:13px;font-weight:500;}
.cf-pd-alert-txt strong{color:var(--crit);font-weight:700;}
.cf-pd-alert .cf-btn{margin-left:auto;}

.cf-pd-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-pd-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--kpi-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-pd-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-pd-kpi.t-brand{--tone:var(--brand);}
.cf-pd-kpi.t-ok{--tone:var(--ok);}
.cf-pd-kpi.t-warn{--tone:var(--warn);}
.cf-pd-kpi.t-crit{--tone:var(--crit);}
.cf-pd-kpi.hero{background:linear-gradient(135deg,color-mix(in oklab,var(--crit) 11%,var(--surface)),var(--surface));}
.cf-pd-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-pd-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-pd-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-pd-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-pd-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-pd-kpi-cta{align-self:flex-start;background:none;border:none;color:var(--crit);font-size:11.5px;font-weight:700;cursor:pointer;padding:0;}

.cf-pd-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.cf-pd-srch{display:flex;align-items:center;gap:9px;flex:1;min-width:230px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 13px;color:var(--text-muted);transition:border-color .2s,box-shadow .2s;}
.cf-pd-srch:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-pd-srch input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:13px;color:var(--text);}
.cf-pd-srch input::placeholder{color:var(--text-muted);}
.cf-pd-srch .x{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:17px;}
.cf-pd-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-pd-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-ui);}
.cf-pd-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-pd-chip-dot{width:7px;height:7px;border-radius:50%;}
.cf-pd-chip-n{font-family:var(--font-mono);font-size:10px;opacity:.7;}
.cf-pd-tools-right{display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap;}
.cf-pd-select{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 11px;color:var(--text-muted);}
.cf-pd-select select{background:none;border:none;outline:none;font-family:var(--font-ui);font-size:12.5px;color:var(--text);cursor:pointer;}
.cf-pd-seg{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:3px;}
.cf-pd-seg button{width:30px;height:28px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-pd-seg button.on{background:var(--brand-soft);color:var(--brand);}

.cf-pd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--gap);}
.cf-pd-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;cursor:pointer;transition:all .16s;display:flex;flex-direction:column;gap:12px;border-top:3px solid var(--cat,var(--brand));}
.cf-pd-card:hover{border-color:var(--border-strong);transform:translateY(-2px);}
.cf-pd-card-tagrow{display:flex;}
.cf-pd-cat{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-pd-cat-dot{width:6px;height:6px;border-radius:50%;background:var(--cat,var(--brand));}
.cf-pd-card-name{font-size:14.5px;font-weight:700;margin-top:6px;}
.cf-pd-card-sku{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-pd-card-mid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.cf-pd-fld-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:2px;}
.cf-pd-fld-v{font-size:13px;font-weight:700;font-family:var(--font-mono);}
.cf-pd-fld-v.brand{color:var(--brand);}
.cf-pd-fld-v.muted{color:var(--text-muted);}
.cf-pd-card-stock{display:flex;flex-direction:column;gap:6px;}
.cf-pd-stock-top{display:flex;justify-content:space-between;align-items:baseline;}
.cf-pd-stock-n{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.cf-pd-stock-n .u{font-size:10px;font-weight:500;color:var(--text-muted);}
.cf-pd-stock-min{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-pd-card-foot{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border);}
.cf-pd-step{display:flex;gap:5px;margin-left:auto;}
.cf-pd-step-btn{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.cf-pd-step-btn.up{color:var(--ok);}
.cf-pd-step-btn.down{color:var(--crit);}
.cf-pd-step-btn:disabled{opacity:.35;cursor:default;}
.cf-pd-ic-btn{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;}

.cf-meter{width:100%;}
.cf-meter-track{position:relative;height:6px;background:var(--track);border-radius:4px;overflow:visible;}
.cf-meter-fill{height:100%;border-radius:4px;transition:width .5s;}
.cf-meter-fill.ok{background:var(--ok);}
.cf-meter-fill.warn{background:var(--warn);}
.cf-meter-fill.crit{background:var(--crit);}
.cf-meter-min{position:absolute;top:-2px;width:2px;height:10px;background:var(--text-muted);border-radius:1px;}

.cf-pd-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-pd-thead{display:grid;grid-template-columns:2.2fr 1fr 90px 1fr 1.4fr 130px;gap:12px;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-pd-th{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-pd-th.r{text-align:right;}
.cf-pd-row{display:grid;grid-template-columns:2.2fr 1fr 90px 1fr 1.4fr 130px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);border-left:3px solid var(--cat,transparent);cursor:pointer;transition:background .12s;}
.cf-pd-row:last-child{border-bottom:none;}
.cf-pd-row:hover{background:var(--surface-2);}
.cf-pd-r-name{display:flex;align-items:center;gap:9px;min-width:0;}
.cf-pd-r-catdot{width:6px;height:6px;border-radius:50%;background:var(--cat,var(--brand));flex-shrink:0;}
.cf-pd-r-nm{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-pd-r-sku{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-pd-cell.r{text-align:right;}
.cf-pd-r-price{font-size:13px;font-weight:700;font-family:var(--font-mono);display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.cf-pd-r-price .c{font-size:10px;font-weight:500;color:var(--text-muted);}
.cf-pd-r-margin{font-family:var(--font-mono);font-weight:700;}
.cf-pd-r-stockwrap{display:flex;flex-direction:column;gap:5px;min-width:90px;}
.cf-pd-r-stocknums{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:12px;}
.cf-pd-r-stocknums .u{font-size:9.5px;color:var(--text-muted);}
.cf-pd-r-actions{display:flex;gap:5px;justify-content:flex-end;}
.cf-pd-empty{padding:60px 20px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px;}
.cf-pd-empty-ic{width:44px;height:44px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);}
@media(max-width:1000px){.cf-pd-thead,.cf-pd-row{grid-template-columns:2fr 1fr 110px;}.cf-pd-th:nth-child(3),.cf-pd-th:nth-child(4),.cf-pd-row>:nth-child(3),.cf-pd-row>:nth-child(4){display:none;}}

.cf-pd-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:cfpFade .2s ease both;}
@keyframes cfpFade{from{opacity:0}to{opacity:1}}
.cf-pd-panel{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-pd-panel-hd{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.cf-pd-panel-cat{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-pd-panel-title{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.25;margin-top:4px;}
.cf-pd-panel-sub{font-size:11.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.cf-pd-panel-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:20px;}
.cf-pd-panel-body::-webkit-scrollbar{width:5px;}
.cf-pd-panel-body::-webkit-scrollbar-thumb{background:var(--track);border-radius:3px;}
.cf-pd-sec-t{font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:11px;}
.cf-pd-adjust{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;}
.cf-pd-adjust-row{display:flex;align-items:center;justify-content:space-between;gap:14px;}
.cf-pd-adjust-big{font-size:26px;font-weight:800;font-family:var(--font-mono);}
.cf-pd-adjust-big.ok{color:var(--ok);}
.cf-pd-adjust-big.warn{color:var(--warn);}
.cf-pd-adjust-big.crit{color:var(--crit);}
.cf-pd-adjust-steps{display:flex;gap:8px;}
.cf-pd-adjust-steps button{display:flex;align-items:center;gap:5px;padding:8px 13px;border-radius:9px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-ui);}
.cf-pd-adjust-steps button.up{color:var(--ok);}
.cf-pd-adjust-steps button.down{color:var(--crit);}
.cf-pd-adjust-steps button:disabled{opacity:.4;cursor:default;}
.cf-pd-adjust-hint{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:10px;}
.cf-pd-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cf-pd-sm-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:3px;}
.cf-pd-sm-v{font-size:15px;font-weight:800;font-family:var(--font-mono);}
.cf-pd-sm-v.brand{color:var(--brand);}
.cf-pd-sm-v.ok{color:var(--ok);}
.cf-pd-panel-foot{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0;}

.cf-pd-mback{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:210;display:flex;align-items:center;justify-content:center;padding:20px;animation:cfpFade .2s ease both;}
.cf-pd-modal{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-pd-modal.sm{max-width:420px;}
.cf-pd-mhd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cf-pd-mtitle{font-size:15px;font-weight:800;}
.cf-pd-msub{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-pd-mbody{padding:18px 22px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;}
.cf-pd-mfoot{padding:13px 22px;border-top:1px solid var(--border);display:flex;gap:9px;flex-shrink:0;}
.cf-pd-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-pd-form-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.cf-pd-field{display:flex;flex-direction:column;gap:5px;}
.cf-pd-field.full{grid-column:1/-1;}
.cf-pd-label{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-pd-input,.cf-pd-fselect,.cf-pd-textarea{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font-ui);outline:none;width:100%;transition:border-color .18s;}
.cf-pd-input:focus,.cf-pd-fselect:focus,.cf-pd-textarea:focus{border-color:var(--brand-line);}
.cf-pd-textarea{min-height:70px;resize:vertical;font-family:var(--font-ui);}
.cf-pd-cat-row{display:flex;gap:8px;}
.cf-pd-mini-add{width:38px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface-2);color:var(--brand);cursor:pointer;font-size:17px;flex-shrink:0;}
.cf-pd-margin-preview{display:flex;gap:20px;background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:var(--radius-sm);padding:12px 14px;}
.cf-pd-mp-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;}
.cf-pd-mp-v{font-size:14px;font-weight:800;font-family:var(--font-mono);color:var(--brand);}
.cf-pd-catlist{display:flex;flex-direction:column;gap:7px;max-height:240px;overflow-y:auto;}
.cf-pd-catitem{display:flex;align-items:center;gap:9px;padding:9px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;}
.cf-pd-catitem-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.cf-pd-catitem-nm{flex:1;font-size:13px;font-weight:600;}
.cf-pd-catitem-n{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-pd-catitem-del{width:24px;height:24px;border-radius:6px;border:none;background:none;color:var(--text-muted);cursor:pointer;}
.cf-pd-catitem-del:hover{color:var(--crit);}
.cf-pd-confirm{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius);width:100%;max-width:380px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 32px 80px rgba(0,0,0,.45);}
.cf-pd-confirm-t{font-size:15px;font-weight:800;}
.cf-pd-confirm-x{font-size:13px;color:var(--text-dim);line-height:1.5;}
.cf-pd-confirm-acts{display:flex;gap:9px;}
.cf-pd-confirm-acts .cf-btn{flex:1;justify-content:center;}

.cf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:cfpFade .3s ease both;white-space:nowrap;}
.cf-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.cf-toast-ic.warn{background:color-mix(in oklab,var(--warn) 14%,transparent);color:var(--warn);}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}

.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfpSh 1.5s infinite;border-radius:8px;}
@keyframes cfpSh{from{background-position:200% 0}to{background-position:-200% 0}}

@media(max-width:1100px){.cf-pd-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-pd-kpis{grid-template-columns:1fr;}.cf-pd-form-row{grid-template-columns:1fr;}}
`;

/* ── Portal ───────────────────────────────────────────────────────────── */
function Portal({children, theme}) {
  useEffect(()=>{ const p=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=p; }; },[]);
  return createPortal(<div className="cf-prod-portal" data-theme={theme}>{children}</div>, document.body);
}

/* ── componentes pequenos ─────────────────────────────────────────────── */
function StatusPill({ s }) { const m = ST_META[s]; return <span className={`cf-pill ${m.cls}`}>{m.label}</span>; }

function Meter({ p }) {
  const s = statusOf(p);
  const pct = Math.min((p.estoque / Math.max(p.minimo * 2.5, p.estoque, 1)) * 100, 100);
  const minPct = Math.min((p.minimo / Math.max(p.minimo * 2.5, p.estoque, 1)) * 100, 100);
  return (
    <div className="cf-meter">
      <div className="cf-meter-track">
        <div className={`cf-meter-fill ${meterCls(s)}`} style={{ width: pct + '%' }} />
        <div className="cf-meter-min" style={{ left: minPct + '%' }} title={`mínimo ${p.minimo}`} />
      </div>
    </div>
  );
}

const FORM_EMPTY = { nome: '', sku: '', categoria: '', unidade: 'un', venda: '', custo: '', estoque: '', minimo: '5', descricao: '' };

/* ── Painel de detalhe (MODAL CENTRAL via Portal — corrige bug de rolagem) ── */
function ProdPanel({ prod, catIndex, onClose, onAdjust, onEdit, onDelete, theme }) {
  if (!prod) return null;
  const s = statusOf(prod);
  const m = margemPct(prod);
  return (
    <Portal theme={theme}>
      <div className="cf-pd-ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="cf-pd-panel">
          <div className="cf-pd-panel-hd">
            <div>
              <div className="cf-pd-panel-cat"><span className="cf-pd-cat-dot" style={{ background: catColor(catIndex) }} />{prod.categoria}</div>
              <div className="cf-pd-panel-title">{prod.nome}</div>
              <div className="cf-pd-panel-sub">SKU {prod.sku}</div>
              <div style={{ marginTop: 10 }}><StatusPill s={s} /></div>
            </div>
            <button className="cf-mclose" onClick={onClose}><Ic d={ICONS.x} size={14}/></button>
          </div>

          <div className="cf-pd-panel-body">
            <section>
              <div className="cf-pd-sec-t">Ajuste rápido de estoque</div>
              <div className="cf-pd-adjust">
                <div className="cf-pd-adjust-row">
                  <div className={`cf-pd-adjust-big ${meterCls(s)}`}>{prod.estoque}<span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}> {prod.unidade}</span></div>
                  <div className="cf-pd-adjust-steps">
                    <button className="down" disabled={prod.estoque === 0} onClick={() => onAdjust(prod.id, -1)}><Ic d={ICONS.minus} size={14}/> Saída</button>
                    <button className="up" onClick={() => onAdjust(prod.id, 1)}><Ic d={ICONS.plus} size={14}/> Entrada</button>
                  </div>
                </div>
                <div className="cf-pd-adjust-hint">mínimo definido: {prod.minimo} {prod.unidade}{s !== 'ok' ? ' · abaixo do mínimo' : ''}</div>
              </div>
            </section>

            <section>
              <div className="cf-pd-sec-t">Precificação</div>
              <div className="cf-pd-summary">
                <div><div className="cf-pd-sm-l">Preço de venda</div><div className="cf-pd-sm-v brand">{fmtBRLp(prod.venda)}</div></div>
                <div><div className="cf-pd-sm-l">Custo</div><div className="cf-pd-sm-v">{fmtBRLp(prod.custo)}</div></div>
                <div><div className="cf-pd-sm-l">Margem</div><div className="cf-pd-sm-v brand">{m.toFixed(0)}%</div></div>
                <div><div className="cf-pd-sm-l">Lucro unitário</div><div className="cf-pd-sm-v ok">{fmtBRLp(prod.venda - prod.custo)}</div></div>
              </div>
            </section>

            <section>
              <div className="cf-pd-sec-t">Valor em estoque</div>
              <div className="cf-pd-summary">
                <div><div className="cf-pd-sm-l">A preço de custo</div><div className="cf-pd-sm-v">{fmtBRLp(prod.estoque * prod.custo)}</div></div>
                <div><div className="cf-pd-sm-l">A preço de venda</div><div className="cf-pd-sm-v ok">{fmtBRLp(prod.estoque * prod.venda)}</div></div>
              </div>
            </section>

            {prod.descricao && (
              <section>
                <div className="cf-pd-sec-t">Descrição</div>
                <div className="cf-pd-confirm-x" style={{ margin: 0 }}>{prod.descricao}</div>
              </section>
            )}
          </div>

          <div className="cf-pd-panel-foot">
            <button className="cf-btn cf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(prod)}><Ic d={ICONS.edit} size={14}/> Editar</button>
            <button className="cf-btn cf-btn-danger" onClick={() => onDelete(prod)}><Ic d={ICONS.trash} size={14}/></button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Produtos() {
  const [theme, setTheme] = useState(getDocTheme);
  const [produtosRaw, setProdutosRaw] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [catFiltro, setCatFiltro] = useState('');
  const [ordem, setOrdem] = useState('nome');
  const [view, setView] = useState('grade');
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formErr, setFormErr] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [novaCat, setNovaCat] = useState('');
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
      const [p, c] = await Promise.all([api.get('/produtos'), api.get('/categorias')]);
      setProdutosRaw(Array.isArray(p) ? p : []);
      setCategorias(Array.isArray(c) ? c : []);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar os produtos.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const produtos = useMemo(() => produtosRaw.map(fromApi), [produtosRaw]);

  const cats = useMemo(() => categorias.map(c => c.nome), [categorias]);
  const catIdGetByNome = (nome) => categorias.find(c => c.nome === nome)?.id ?? null;
  const catIdx = (c) => Math.max(0, cats.indexOf(c));

  const counts = useMemo(() => ({
    todos: produtos.length,
    ok: produtos.filter(p => statusOf(p) === 'ok').length,
    baixo: produtos.filter(p => statusOf(p) === 'baixo').length,
    esgotado: produtos.filter(p => statusOf(p) === 'esgotado').length,
  }), [produtos]);

  const kpis = useMemo(() => {
    const unidades = produtos.reduce((a, p) => a + p.estoque, 0);
    const valorVenda = produtos.reduce((a, p) => a + p.estoque * p.venda, 0);
    const valorCusto = produtos.reduce((a, p) => a + p.estoque * p.custo, 0);
    const margens = produtos.filter(p => p.custo > 0).map(margemPct);
    const margemMedia = margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;
    return { unidades, valorVenda, valorCusto, margemMedia, alertas: counts.baixo + counts.esgotado };
  }, [produtos, counts]);

  const lista = useMemo(() => {
    let r = produtos.filter(p => {
      if (filtro !== 'todos' && statusOf(p) !== filtro) return false;
      if (catFiltro && p.categoria !== catFiltro) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const cmp = {
      nome: (a, b) => a.nome.localeCompare(b.nome),
      estoque: (a, b) => a.estoque - b.estoque,
      margem: (a, b) => margemPct(b) - margemPct(a),
      valor: (a, b) => (b.estoque * b.custo) - (a.estoque * a.custo),
    }[ordem];
    return [...r].sort(cmp);
  }, [produtos, filtro, catFiltro, busca, ordem]);

  const adjust = async (id, delta) => {
    const prod = produtos.find(p => p.id === id);
    if (!prod) return;
    if (delta < 0 && prod.estoque <= 0) return;
    try {
      await api.post('/movimentacoes', {
        produto_id: id, tipo: delta > 0 ? 'entrada' : 'saida',
        quantidade: 1, motivo: 'Ajuste rápido (tela Produtos)', observacao: null,
      });
      const novo = Math.max(0, prod.estoque + delta);
      setProdutosRaw(ps => ps.map(p => p.id === id ? { ...p, estoque_atual: novo } : p));
      setSel(s => s && s.id === id ? { ...s, estoque: novo } : s);
      showToast(`${delta > 0 ? 'Entrada' : 'Saída'} registrada · estoque agora ${novo}`, delta > 0 ? 'ok' : 'warn');
    } catch (e) {
      showToast(e.message || 'Erro ao ajustar estoque', 'err');
    }
  };

  const openNovo = () => { setForm(FORM_EMPTY); setFormErr(''); setModal('novo'); };
  const openEdit = (p) => {
    setForm({ nome: p.nome, sku: p.sku === '—' ? '' : p.sku, categoria: p.categoria, unidade: p.unidade,
      venda: p.venda, custo: p.custo, estoque: p.estoque, minimo: p.minimo, descricao: p.descricao || '' });
    setFormErr(''); setModal({ editId: p.id });
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.venda) { setFormErr('Nome e preço de venda são obrigatórios.'); return; }
    const categoriaId = form.categoria ? catIdGetByNome(form.categoria) : null;
    setSalvando(true); setFormErr('');
    try {
      const payload = toApi(form, categoriaId);
      if (modal.editId) {
        await api.put(`/produtos/${modal.editId}`, payload);
        showToast('Produto atualizado');
      } else {
        await api.post('/produtos', payload);
        showToast('Produto cadastrado');
      }
      setModal(null);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Erro ao salvar produto.');
    } finally { setSalvando(false); }
  };

  const remover = async (p) => {
    try {
      await api.del(`/produtos/${p.id}`);
      setConfirmDel(null); setSel(null);
      showToast('Produto removido', 'err');
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao remover produto', 'err');
    }
  };

  const criarCat = async () => {
    const nome = novaCat.trim();
    if (!nome || cats.includes(nome)) return;
    try {
      await api.post('/categorias', { nome });
      setForm(f => ({ ...f, categoria: nome }));
      setNovaCat('');
      showToast(`Categoria "${nome}" criada`);
      await load();
    } catch (e) {
      showToast(e.message || 'Erro ao criar categoria', 'err');
    }
  };

  const STATUS_CHIPS = [
    { k: 'todos', label: 'Todos', dot: null },
    { k: 'ok', label: 'Em estoque', dot: 'var(--ok)' },
    { k: 'baixo', label: 'Estoque baixo', dot: 'var(--warn)' },
    { k: 'esgotado', label: 'Esgotados', dot: 'var(--crit)' },
  ];
  const ORD_LABEL = { nome: 'Nome (A–Z)', estoque: 'Menor estoque', margem: 'Maior margem', valor: 'Valor em estoque' };

  const KPIS = [
    { tone: 't-brand', ic: 'box', val: produtos.length, lbl: 'Produtos cadastrados', sub: `${kpis.unidades} unidades em estoque` },
    { tone: 't-ok', ic: 'spark', val: fmtBRLp(kpis.valorVenda, 0), lbl: 'Patrimônio (a preço de venda)', sub: `custo ${fmtBRLp(kpis.valorCusto, 0)}` },
    { tone: 't-brand', ic: 'chart', val: kpis.margemMedia.toFixed(0) + '%', lbl: 'Margem média', sub: 'sobre o custo' },
    { tone: 't-crit', ic: 'bell', val: kpis.alertas, lbl: 'Alertas de estoque', sub: `${counts.esgotado} esgotado(s) · ${counts.baixo} baixo(s)`, hero: kpis.alertas > 0, cta: kpis.alertas > 0 ? 'Ver alertas' : null },
  ];

  return (
    <div className="cf-prod-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-prod">

        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800}}>Produtos</div>
            <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--font-mono)',marginTop:4}}>{produtos.length} produtos cadastrados</div>
          </div>
          <button className="cf-btn cf-btn-primary" onClick={openNovo}><Ic d={ICONS.plus} size={15}/> Novo produto</button>
        </div>

        {erro && <div className="cf-pd-err">⚠ {erro}</div>}

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
        ) : (
          <>
            {(counts.esgotado > 0 || counts.baixo > 0) && (
              <div className="cf-pd-alert">
                <span className="cf-att-pulse" />
                <span className="cf-pd-alert-txt"><strong>{counts.esgotado + counts.baixo} produto(s) precisam de reposição</strong> — {counts.esgotado} esgotado(s) e {counts.baixo} abaixo do mínimo.</span>
                <button className="cf-btn cf-btn-ghost sm" onClick={() => { setFiltro('baixo'); setCatFiltro(''); }}>Repor estoque baixo</button>
              </div>
            )}

            <div className="cf-pd-kpis">
              {KPIS.map(k => (
                <div key={k.lbl} className={`cf-pd-kpi ${k.tone}${k.hero ? ' hero' : ''}`}>
                  <div className="cf-pd-kpi-top"><span className="cf-pd-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
                  <div className="cf-pd-kpi-val">{k.val}</div>
                  <div>
                    <div className="cf-pd-kpi-lbl">{k.lbl}</div>
                    <div className="cf-pd-kpi-sub">{k.sub}</div>
                  </div>
                  {k.cta && <button className="cf-pd-kpi-cta" onClick={() => { setFiltro('esgotado'); setCatFiltro(''); }}>{k.cta} →</button>}
                </div>
              ))}
            </div>

            <div className="cf-pd-toolbar">
              <div className="cf-pd-srch">
                <Ic d={ICONS.search} size={15} />
                <input placeholder="Buscar nome, SKU ou categoria…" value={busca} onChange={e => setBusca(e.target.value)} />
                {busca && <button className="x" onClick={() => setBusca('')}>×</button>}
              </div>
              <div className="cf-pd-chips">
                {STATUS_CHIPS.map(c => (
                  <button key={c.k} className={`cf-pd-chip${filtro === c.k ? ' on' : ''}`} onClick={() => setFiltro(c.k)}>
                    {c.dot && <span className="cf-pd-chip-dot" style={{ background: c.dot }} />}
                    {c.label}<span className="cf-pd-chip-n">{counts[c.k]}</span>
                  </button>
                ))}
              </div>
              <div className="cf-pd-tools-right">
                <div className="cf-pd-select">
                  <Ic d={ICONS.tag} size={14} />
                  <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
                    <option value="">Todas categorias</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="cf-pd-select">
                  <Ic d={ICONS.sort} size={14} />
                  <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                    {Object.entries(ORD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="cf-pd-seg">
                  <button className={view === 'grade' ? 'on' : ''} onClick={() => setView('grade')} title="Grade"><Ic d={ICONS.grid} size={15}/></button>
                  <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')} title="Lista"><Ic d={ICONS.list} size={15}/></button>
                </div>
                <button className="cf-btn cf-btn-ghost sm" onClick={() => setCatModal(true)}><Ic d={ICONS.tag} size={13}/> Categorias</button>
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="cf-pd-table"><div className="cf-pd-empty"><div className="cf-pd-empty-ic"><Ic d={ICONS.box} size={20}/></div><div>Nenhum produto neste filtro</div></div></div>
            ) : view === 'grade' ? (
              <div className="cf-pd-grid">
                {lista.map(p => {
                  const s = statusOf(p), ci = catIdx(p.categoria);
                  return (
                    <div key={p.id} className="cf-pd-card" style={{ '--cat': catColor(ci) }} onClick={() => setSel(p)}>
                      <div className="cf-pd-card-top">
                        <div className="cf-pd-card-tagrow"><span className="cf-pd-cat"><span className="cf-pd-cat-dot" />{p.categoria}</span></div>
                        <div className="cf-pd-card-name">{p.nome}</div>
                        <div className="cf-pd-card-sku">SKU {p.sku}</div>
                      </div>
                      <div className="cf-pd-card-mid">
                        <div><div className="cf-pd-fld-l">Venda</div><div className="cf-pd-fld-v brand">{fmtBRLp(p.venda)}</div></div>
                        <div><div className="cf-pd-fld-l">Custo</div><div className="cf-pd-fld-v muted">{fmtBRLp(p.custo)}</div></div>
                        <div><div className="cf-pd-fld-l">Margem</div><div className="cf-pd-fld-v">{margemPct(p).toFixed(0)}%</div></div>
                      </div>
                      <div className="cf-pd-card-stock">
                        <div className="cf-pd-stock-top">
                          <span className="cf-pd-stock-n">{p.estoque}<span className="u"> {p.unidade}</span></span>
                          <span className="cf-pd-stock-min">mín {p.minimo}</span>
                        </div>
                        <Meter p={p} />
                      </div>
                      <div className="cf-pd-card-foot" onClick={e => e.stopPropagation()}>
                        <StatusPill s={s} />
                        <div className="cf-pd-step">
                          <button className="cf-pd-step-btn down" disabled={p.estoque === 0} onClick={() => adjust(p.id, -1)} title="Saída"><Ic d={ICONS.minus} size={14}/></button>
                          <button className="cf-pd-step-btn up" onClick={() => adjust(p.id, 1)} title="Entrada"><Ic d={ICONS.plus} size={14}/></button>
                        </div>
                        <button className="cf-pd-ic-btn" onClick={() => openEdit(p)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cf-pd-table">
                <div className="cf-pd-thead">
                  <div className="cf-pd-th">Produto</div>
                  <div className="cf-pd-th r">Venda / Custo</div>
                  <div className="cf-pd-th r">Margem</div>
                  <div className="cf-pd-th">Status</div>
                  <div className="cf-pd-th">Estoque</div>
                  <div className="cf-pd-th r">Ações</div>
                </div>
                {lista.map(p => {
                  const s = statusOf(p), ci = catIdx(p.categoria);
                  return (
                    <div key={p.id} className="cf-pd-row" style={{ '--cat': catColor(ci) }} onClick={() => setSel(p)}>
                      <div className="cf-pd-r-name">
                        <span className="cf-pd-r-catdot" />
                        <div className="cf-pd-r-name-info">
                          <div className="cf-pd-r-nm">{p.nome}</div>
                          <div className="cf-pd-r-sku">{p.categoria} · {p.sku}</div>
                        </div>
                      </div>
                      <div className="cf-pd-cell r price-c"><div className="cf-pd-r-price">{fmtBRLp(p.venda)}<span className="c">custo {fmtBRLp(p.custo)}</span></div></div>
                      <div className="cf-pd-cell r margin-c"><span className="cf-pd-r-margin">{margemPct(p).toFixed(0)}%</span></div>
                      <div className="cf-pd-cell"><StatusPill s={s} /></div>
                      <div className="cf-pd-cell">
                        <div className="cf-pd-r-stockwrap">
                          <div className="cf-pd-r-stocknums"><strong>{p.estoque}</strong><span className="u">{p.unidade} · mín {p.minimo}</span></div>
                          <Meter p={p} />
                        </div>
                      </div>
                      <div className="cf-pd-cell r" onClick={e => e.stopPropagation()}>
                        <div className="cf-pd-r-actions">
                          <button className="cf-pd-step-btn down" disabled={p.estoque === 0} onClick={() => adjust(p.id, -1)} title="Saída"><Ic d={ICONS.minus} size={14}/></button>
                          <button className="cf-pd-step-btn up" onClick={() => adjust(p.id, 1)} title="Entrada"><Ic d={ICONS.plus} size={14}/></button>
                          <button className="cf-pd-ic-btn" onClick={() => openEdit(p)} title="Editar"><Ic d={ICONS.edit} size={14}/></button>
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
        <ProdPanel
          prod={produtos.find(p => p.id === sel.id) || sel}
          catIndex={catIdx((produtos.find(p => p.id === sel.id) || sel).categoria)}
          onClose={() => setSel(null)} onAdjust={adjust} onEdit={openEdit} onDelete={setConfirmDel}
          theme={theme}
        />
      )}

      {modal && (
        <Portal theme={theme}>
          <div className="cf-pd-mback" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="cf-pd-modal">
              <div className="cf-pd-mhd">
                <div><div className="cf-pd-mtitle">{modal.editId ? 'Editar produto' : 'Novo produto'}</div><div className="cf-pd-msub">{modal.editId ? 'Atualize as informações' : 'Preencha os dados do produto'}</div></div>
                <button className="cf-mclose" onClick={() => setModal(null)}><Ic d={ICONS.x} size={14}/></button>
              </div>
              <div className="cf-pd-mbody">
                {formErr && <div className="cf-pd-err">⚠ {formErr}</div>}
                <div className="cf-pd-form-row">
                  <div className="cf-pd-field full"><label className="cf-pd-label">Nome *</label><input className="cf-pd-input" placeholder="Nome do produto" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                </div>
                <div className="cf-pd-form-row">
                  <div className="cf-pd-field"><label className="cf-pd-label">SKU</label><input className="cf-pd-input" placeholder="Ex: SKN-VC30" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
                  <div className="cf-pd-field"><label className="cf-pd-label">Unidade</label>
                    <select className="cf-pd-fselect" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                      {['un', 'ml', 'g', 'kg', 'cx', 'kit'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="cf-pd-form-row">
                  <div className="cf-pd-field"><label className="cf-pd-label">Preço de venda *</label><input className="cf-pd-input" type="number" step="0.01" min="0" placeholder="0,00" value={form.venda} onChange={e => setForm(f => ({ ...f, venda: e.target.value }))} /></div>
                  <div className="cf-pd-field"><label className="cf-pd-label">Preço de custo</label><input className="cf-pd-input" type="number" step="0.01" min="0" placeholder="0,00" value={form.custo} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} /></div>
                </div>
                <div className="cf-pd-form-row">
                  <div className="cf-pd-field"><label className="cf-pd-label">Estoque atual</label><input className="cf-pd-input" type="number" min="0" placeholder="0" value={form.estoque} onChange={e => setForm(f => ({ ...f, estoque: e.target.value }))} /></div>
                  <div className="cf-pd-field"><label className="cf-pd-label">Estoque mínimo</label><input className="cf-pd-input" type="number" min="0" placeholder="5" value={form.minimo} onChange={e => setForm(f => ({ ...f, minimo: e.target.value }))} /></div>
                </div>
                <div className="cf-pd-field full"><label className="cf-pd-label">Categoria</label>
                  <div className="cf-pd-cat-row">
                    <select className="cf-pd-fselect" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                      <option value="">Selecione…</option>
                      {cats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className="cf-pd-mini-add" onClick={() => setCatModal(true)} title="Gerenciar categorias">+</button>
                  </div>
                </div>
                <div className="cf-pd-field full"><label className="cf-pd-label">Descrição</label><textarea className="cf-pd-textarea" placeholder="Descreva o produto…" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                {form.venda && parseFloat(form.custo) > 0 && (
                  <div className="cf-pd-margin-preview">
                    <div><div className="cf-pd-mp-l">Margem</div><div className="cf-pd-mp-v">{(((parseFloat(form.venda) - parseFloat(form.custo)) / parseFloat(form.custo)) * 100).toFixed(1)}%</div></div>
                    <div><div className="cf-pd-mp-l">Lucro unitário</div><div className="cf-pd-mp-v">{fmtBRLp(parseFloat(form.venda) - parseFloat(form.custo))}</div></div>
                  </div>
                )}
              </div>
              <div className="cf-pd-mfoot">
                <button className="cf-btn cf-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : (modal.editId ? 'Salvar' : 'Cadastrar')}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {catModal && (
        <Portal theme={theme}>
          <div className="cf-pd-mback" onClick={e => e.target === e.currentTarget && setCatModal(false)}>
            <div className="cf-pd-modal sm">
              <div className="cf-pd-mhd">
                <div><div className="cf-pd-mtitle">Categorias</div><div className="cf-pd-msub">{cats.length} categoria(s)</div></div>
                <button className="cf-mclose" onClick={() => setCatModal(false)}><Ic d={ICONS.x} size={14}/></button>
              </div>
              <div className="cf-pd-mbody">
                <div className="cf-pd-cat-row">
                  <input className="cf-pd-input" placeholder="Nome da nova categoria…" value={novaCat} onChange={e => setNovaCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && criarCat()} />
                  <button className="cf-btn cf-btn-primary" onClick={criarCat} disabled={!novaCat.trim()}>Criar</button>
                </div>
                <div className="cf-pd-catlist">
                  {categorias.map((c, i) => (
                    <div key={c.id} className="cf-pd-catitem">
                      <span className="cf-pd-catitem-dot" style={{ background: catColor(i) }} />
                      <span className="cf-pd-catitem-nm">{c.nome}</span>
                      <span className="cf-pd-catitem-n">{produtos.filter(p => p.categoria === c.nome).length} produto(s)</span>
                      <button className="cf-pd-catitem-del" title="Remover categoria"
                        onClick={async()=>{ try{ await api.del(`/categorias/${c.id}`); showToast('Categoria removida'); await load(); }catch(e){ showToast(e.message,'err'); } }}>
                        <Ic d={ICONS.trash} size={13}/>
                      </button>
                    </div>
                  ))}
                  {categorias.length===0 && <div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:'10px 0'}}>Nenhuma categoria cadastrada</div>}
                </div>
              </div>
              <div className="cf-pd-mfoot"><button className="cf-btn cf-btn-ghost" onClick={() => setCatModal(false)}>Fechar</button></div>
            </div>
          </div>
        </Portal>
      )}

      {confirmDel && (
        <Portal theme={theme}>
          <div className="cf-pd-mback" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
            <div className="cf-pd-confirm">
              <div className="cf-pd-confirm-t">Remover produto?</div>
              <div className="cf-pd-confirm-x">Tem certeza que deseja remover <strong>{confirmDel.nome}</strong>? Esta ação não pode ser desfeita.</div>
              <div className="cf-pd-confirm-acts">
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