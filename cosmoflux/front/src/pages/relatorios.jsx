import { useState, useEffect, useMemo, useCallback } from 'react';

/* ── API ──────────────────────────────────────────────────────────────── */
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = { get: url => fetch(BASE+url,{headers:h()}).then(async r=>{const d=await r.json().catch(()=>([]));if(!r.ok)throw new Error(d.detail||'Erro');return d;}) };
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };

/* ── helpers ──────────────────────────────────────────────────────────── */
const fmtBRL = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtNum = (v) => Number(v || 0).toLocaleString('pt-BR');
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const iso = (d) => d.toISOString().slice(0, 10);
const monthLabel = (d) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const fmtDelta = (v) => {
  if (v == null) return null;
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(1).replace('.', ',')}%`;
};
const toneOf = (v, invert=false) => {
  if (v == null || v === 0) return 'neutro';
  const positivo = invert ? v < 0 : v > 0;
  return positivo ? 'ok' : 'crit';
};

const waLink = (nome, tel, valor, dias) => {
  const digits = (tel || '').replace(/\D/g, '');
  const primeiro = nome.split(' ')[0];
  const msg = dias > 0
    ? `Oi, ${primeiro}! Tudo bem? Passando pra lembrar do saldo de ${fmtBRL(valor)} aqui na loja, com ${dias} dia(s) em atraso. Quando puder, me avisa pra gente acertar!`
    : `Oi, ${primeiro}! Tudo bem? Só um lembrete do saldo de ${fmtBRL(valor)} aqui na loja. Qualquer dúvida me chama!`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
};

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>{d}</svg>
);
const ICONS = {
  compare: <><path d="M9 3v18M15 3v18"/><path d="M3 9h6M15 9h6M3 15h6M15 15h6"/></>,
  wallet:  <><path d="M20 12V8H4a2 2 0 0 1 0-4h12v4"/><path d="M4 6v14a2 2 0 0 0 2 2h14v-4"/><path d="M20 12v4h-4a2 2 0 0 1 0-4h4Z"/></>,
  box:     <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></>,
  up:      <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>,
  down:    <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
  wa:      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.6 11.6 0 0 1-4.8-4.3c-.4-.6-.9-1.5-.9-2.4 0-.9.5-1.3.7-1.5.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.5.2.4.8 1.2 1.6 1.9 1 .9 1.8 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z"/>,
  cal:     <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  alert:   <><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  gem:     <><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></>,
  target:  <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
};

/* ── date helpers ─────────────────────────────────────────────────────── */
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const MES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// gera opções dos últimos 12 meses (do atual pra trás)
const listarMesesRecentes = (n = 12) => {
  const hoje = new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push({ mes: d.getMonth() + 1, ano: d.getFullYear(), label: `${MES_NOMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
};
const PRESETS = [
  { key: 'mes_especifico',           label: 'Mês específico vs anterior', tipo: 'mes' },
  { key: 'ultimos_30_vs_anteriores', label: 'Últimos 30d vs 30d antes',   tipo: 'fixo' },
  { key: 'ultimos_7_vs_anteriores',  label: 'Últimos 7d vs 7d antes',     tipo: 'fixo' },
  { key: 'ano_atual_vs_anterior',    label: 'Este ano vs ano passado',    tipo: 'fixo' },
];

function computePreset(key, mesEscolhido) {
  const hoje = new Date();
  if (key === 'mes_especifico') {
    // mesEscolhido = {mes, ano} — mês âncora escolhido pelo usuário
    const m = (mesEscolhido?.mes ?? (hoje.getMonth() + 1)) - 1;
    const y = mesEscolhido?.ano ?? hoje.getFullYear();
    const inicio = new Date(y, m, 1);
    const isMesAtualDoAno = (y === hoje.getFullYear() && m === hoje.getMonth());
    const fim = isMesAtualDoAno ? hoje : new Date(y, m + 1, 0);
    const antIni = new Date(y, m - 1, 1);
    const antFim = new Date(y, m, 0);
    return { a_ini: inicio, a_fim: fim, b_ini: antIni, b_fim: antFim,
             labelA: `${MES_NOMES[m]} ${y}`, labelB: `${MES_NOMES[antIni.getMonth()]} ${antIni.getFullYear()}` };
  }
  if (key === 'ultimos_30_vs_anteriores') {
    return { a_ini: daysAgo(29), a_fim: hoje, b_ini: daysAgo(59), b_fim: daysAgo(30), labelA: 'Últimos 30 dias', labelB: '30 dias anteriores' };
  }
  if (key === 'ultimos_7_vs_anteriores') {
    return { a_ini: daysAgo(6), a_fim: hoje, b_ini: daysAgo(13), b_fim: daysAgo(7), labelA: 'Últimos 7 dias', labelB: '7 dias anteriores' };
  }
  const anoIni = new Date(hoje.getFullYear(), 0, 1);
  const anoAntIni = new Date(hoje.getFullYear() - 1, 0, 1);
  const anoAntFim = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
  return { a_ini: anoIni, a_fim: hoje, b_ini: anoAntIni, b_fim: anoAntFim, labelA: `${hoje.getFullYear()} (até hoje)`, labelB: `${hoje.getFullYear()-1} (mesmo período)` };
}

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-rel-root *,.cf-rel-root *::before,.cf-rel-root *::after{box-sizing:border-box;}
.cf-rel-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--card-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cfrIn .3s ease both;}
@keyframes cfrIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes cfrUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cf-rel-root[data-theme="dark"],.cf-rel-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);--cat-0:#9166d8;--cat-1:#3b82f6;--cat-2:#21a06d;--cat-3:#e08a2a;--cat-4:#c75c8a;}
.cf-rel-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);--cat-0:#9166d8;--cat-1:#3b82f6;--cat-2:#1a8a5d;--cat-3:#c8770f;--cat-4:#b3577f;}
.cf-rel-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}

.cf-rel{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}
.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}
.cf-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:var(--card-pad) var(--card-pad) 10px;flex-wrap:wrap;}
.cf-card-title{font-size:14px;font-weight:800;}
.cf-card-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.cf-card-pad{padding:14px var(--card-pad) var(--card-pad);}
.cf-row{display:grid;gap:var(--gap);}
.cf-row-1-1{grid-template-columns:1fr 1fr;}
.cf-row-2-1{grid-template-columns:2fr 1fr;}
@media(max-width:1000px){.cf-row-1-1,.cf-row-2-1{grid-template-columns:1fr;}}
.cf-rel-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfrSh 1.5s infinite;border-radius:8px;}
@keyframes cfrSh{from{background-position:200% 0}to{background-position:-200% 0}}

.cf-rp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.cf-rp-head-t{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.cf-rp-head-sub{font-size:12px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.cf-rp-tabs{display:inline-flex;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:3px;gap:2px;box-shadow:var(--shadow);flex-wrap:wrap;}
.cf-rp-tabs button{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:8px;border:none;background:none;cursor:pointer;font-family:var(--font-ui);font-size:12.5px;font-weight:600;color:var(--text-muted);transition:all .15s;}
.cf-rp-tabs button:hover:not(.on){color:var(--text);}
.cf-rp-tabs button.on{background:var(--brand-soft);color:var(--brand);}

.cf-rp-body{display:flex;flex-direction:column;gap:var(--gap);animation:cfrUp .35s cubic-bezier(.22,1,.36,1);}
.cf-rp-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:var(--card-pad);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}
.cf-rp-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-rp-chip{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface-2);font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:all .15s;}
.cf-rp-chip:hover:not(.on){color:var(--text);border-color:var(--border-strong);}
.cf-rp-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}
.cf-rp-date{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:7px 11px;font-family:var(--font-mono);font-size:12px;color:var(--text);}
.cf-rp-date-l{font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:3px;}
.cf-rp-select{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:7px 11px;font-family:var(--font-ui);font-size:12.5px;font-weight:600;color:var(--text);cursor:pointer;outline:none;transition:border-color .15s;}
.cf-rp-select:hover{border-color:var(--border-strong);}
.cf-rp-select:focus{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-rp-search{display:flex;align-items:center;gap:8px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:6px 11px;flex:1;min-width:200px;max-width:320px;transition:border-color .15s,box-shadow .15s;}
.cf-rp-search:focus-within{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-rp-search input{flex:1;min-width:0;background:none;border:none;outline:none;font-family:var(--font-ui);font-size:12.5px;color:var(--text);}
.cf-rp-search input::placeholder{color:var(--text-muted);}
.cf-rp-search .x{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:0 2px;}
.cf-rp-minval{display:flex;align-items:center;gap:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:6px 11px;}
.cf-rp-minval-l{font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);white-space:nowrap;}
.cf-rp-minval input{width:78px;background:none;border:none;outline:none;font-family:var(--font-mono);font-size:12px;color:var(--text);text-align:right;}

/* KPI comparativo (usado em Comparar) */
.cf-cmp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-cmp-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px;}
.cf-cmp-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-cmp-kpi.t-brand{--tone:var(--brand);}
.cf-cmp-kpi.t-ok{--tone:var(--ok);}
.cf-cmp-kpi.t-warn{--tone:var(--warn);}
.cf-cmp-kpi.t-info{--tone:#3b82f6;}
.cf-cmp-lbl{font-size:11px;font-weight:600;color:var(--text-dim);}
.cf-cmp-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-cmp-vs{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);}
.cf-cmp-vs-v{font-family:var(--font-mono);}
.cf-cmp-delta{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;font-weight:700;}
.cf-cmp-delta.ok{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-cmp-delta.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-cmp-delta.neutro{background:var(--surface-2);color:var(--text-muted);}
@media(max-width:1100px){.cf-cmp-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-cmp-kpis{grid-template-columns:1fr;}}

/* gráfico de linhas sobrepostas */
.cf-lchart{height:220px;position:relative;}
.cf-lchart svg{width:100%;height:100%;overflow:visible;}
.cf-lchart-legend{display:flex;gap:16px;justify-content:center;margin-top:8px;flex-wrap:wrap;}
.cf-lchart-leg{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--text-dim);}
.cf-lchart-leg-dot{width:12px;height:3px;border-radius:2px;}

/* mover / subir / cair */
.cf-mov-list{display:flex;flex-direction:column;}
.cf-mov-row{display:flex;align-items:center;gap:12px;padding:11px var(--card-pad);border-bottom:1px solid var(--border);}
.cf-mov-row:last-child{border-bottom:none;}
.cf-mov-icb{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-mov-icb.up{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-mov-icb.dn{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-mov-nm{flex:1;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-mov-vals{display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
.cf-mov-vals-r{font-family:var(--font-mono);font-size:12px;font-weight:700;}
.cf-mov-vals-r.up{color:var(--ok);}
.cf-mov-vals-r.dn{color:var(--crit);}
.cf-mov-vals-s{font-family:var(--font-mono);font-size:10px;color:var(--text-muted);}

/* aba A Receber */
.cf-rec-hero{display:grid;grid-template-columns:1fr 3fr;gap:var(--gap);}
.cf-rec-total{background:linear-gradient(150deg,color-mix(in oklab,var(--crit) 14%,var(--surface)),var(--surface));border:1px solid color-mix(in oklab,var(--crit) 32%,transparent);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px;display:flex;flex-direction:column;justify-content:center;gap:6px;}
.cf-rec-total-l{font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);}
.cf-rec-total-v{font-size:30px;font-weight:800;font-family:var(--font-mono);color:var(--crit);letter-spacing:-.02em;}
.cf-rec-total-s{font-size:11px;color:var(--text-dim);}
.cf-rec-buckets{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;}
.cf-rec-bucket{padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);position:relative;overflow:hidden;background:var(--surface-2);}
.cf-rec-bucket::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));opacity:.85;}
.cf-rec-bucket.t-ok{--tone:var(--ok);}
.cf-rec-bucket.t-warn{--tone:var(--warn);}
.cf-rec-bucket.t-crit{--tone:var(--crit);}
.cf-rec-bucket.t-dark{--tone:#8b0000;}
.cf-rec-bucket-l{font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:4px;}
.cf-rec-bucket-v{font-size:16px;font-weight:800;font-family:var(--font-mono);}
.cf-rec-bucket-p{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
@media(max-width:1000px){.cf-rec-hero{grid-template-columns:1fr;}.cf-rec-buckets{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-rec-buckets{grid-template-columns:1fr;}}

.cf-rec-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-rec-thead,.cf-rec-row{display:grid;grid-template-columns:2.4fr 1fr 100px 130px 110px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-rec-row:last-child{border-bottom:none;}
.cf-rec-th{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-rec-th.r,.cf-rec-cell.r{text-align:right;justify-self:end;}
.cf-rec-row{cursor:default;transition:background .12s;}
.cf-rec-row:hover{background:color-mix(in oklab,var(--text) 3%,transparent);}
.cf-rec-cli{display:flex;align-items:center;gap:10px;min-width:0;}
.cf-rec-avatar{width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(140deg,color-mix(in oklab,var(--brand) 72%,#7a4df0),var(--brand));}
.cf-rec-nm{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-rec-nm-sub{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-rec-atraso{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-family:var(--font-mono);font-size:10.5px;font-weight:700;}
.cf-rec-atraso.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-rec-atraso.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-rec-atraso.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-rec-saldo{font-family:var(--font-mono);font-size:14px;font-weight:800;}
.cf-rec-wa{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:9px;background:color-mix(in oklab,#25d366 12%,transparent);color:#1ebe5a;border:1px solid color-mix(in oklab,#25d366 28%,transparent);font-size:11px;font-weight:700;cursor:pointer;text-decoration:none;}
.cf-rec-wa:hover{background:color-mix(in oklab,#25d366 20%,transparent);}
.cf-rp-empty{padding:48px 20px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;}
@media(max-width:1000px){.cf-rec-thead{display:none;}.cf-rec-row{grid-template-columns:1fr auto;grid-auto-rows:auto;gap:5px 12px;padding:14px 16px;}.cf-rec-cell:nth-child(2),.cf-rec-cell:nth-child(3){display:none;}}

/* aba Produtos */
.cf-pr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-pr-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px;}
.cf-pr-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-pr-kpi.t-brand{--tone:var(--brand);}
.cf-pr-kpi.t-ok{--tone:var(--ok);}
.cf-pr-kpi.t-info{--tone:#3b82f6;}
.cf-pr-kpi.t-warn{--tone:var(--warn);}
.cf-pr-kpi-lbl{font-size:11px;font-weight:600;color:var(--text-dim);}
.cf-pr-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-pr-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);}
@media(max-width:1100px){.cf-pr-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-pr-kpis{grid-template-columns:1fr;}}

.cf-top-row{display:flex;align-items:center;gap:12px;padding:10px var(--card-pad);border-bottom:1px solid var(--border);}
.cf-top-row:last-child{border-bottom:none;}
.cf-rank{font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--brand);min-width:18px;}
.cf-top-main{flex:1;min-width:0;}
.cf-top-name{font-size:12.5px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-top-cat{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-top-bar{height:5px;background:var(--track);border-radius:3px;overflow:hidden;margin-top:3px;}
.cf-top-fill{height:100%;background:var(--brand);border-radius:3px;transition:width .8s cubic-bezier(.22,1,.36,1);}
.cf-top-fill.ok{background:var(--ok);}
.cf-top-val{font-family:var(--font-mono);font-size:12px;font-weight:700;white-space:nowrap;text-align:right;min-width:70px;}

.cf-pr-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-pr-thead,.cf-pr-trow{display:grid;grid-template-columns:44px 2.2fr 1fr 90px 1fr 1fr 1fr 90px;gap:12px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);}
.cf-pr-trow:last-child{border-bottom:none;}
.cf-pr-th{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-pr-th.r,.cf-pr-cell.r{text-align:right;justify-self:end;}
.cf-pr-num{font-family:var(--font-mono);font-size:12px;color:var(--text-dim);}
.cf-pr-num.ok{color:var(--ok);font-weight:700;}
.cf-pr-num.warn{color:var(--warn);}
.cf-pr-margin{display:inline-flex;padding:2px 9px;border-radius:7px;font-family:var(--font-mono);font-size:10.5px;font-weight:700;}
.cf-pr-margin.high{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-pr-margin.mid{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pr-margin.low{background:color-mix(in oklab,var(--crit) 15%,transparent);color:var(--crit);}
.cf-pr-trow.oport{background:color-mix(in oklab,var(--brand) 5%,transparent);}
.cf-pr-oport-tag{display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono);font-size:9.5px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.06em;}
@media(max-width:1100px){.cf-pr-thead{display:none;}.cf-pr-trow{grid-template-columns:1fr auto;grid-auto-rows:auto;gap:5px 12px;padding:12px 16px;}.cf-pr-cell:nth-child(1),.cf-pr-cell:nth-child(3),.cf-pr-cell:nth-child(4),.cf-pr-cell:nth-child(5){display:none;}}

.cf-pr-oport{background:linear-gradient(135deg,color-mix(in oklab,var(--brand) 8%,var(--surface)),var(--surface));border:1px solid var(--brand-line);border-radius:var(--radius);padding:14px 18px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow);}
.cf-pr-oport-ic{width:34px;height:34px;border-radius:9px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-pr-oport-t{font-size:13px;font-weight:800;}
.cf-pr-oport-s{font-size:11px;color:var(--text-dim);margin-top:2px;}
`;

/* ── LineChart sobreposto (2 séries) ──────────────────────────────────── */
function LineChart({ serieA, serieB, labelA, labelB }) {
  const n = Math.max(serieA.length, serieB.length);
  if (n < 2) return <div className="cf-rp-empty">Sem dados suficientes</div>;
  const w = 720, ht = 200, pad = 26;
  const all = [...serieA, ...serieB];
  const max = Math.max(...all, 1);
  const pts = (arr) => arr.map((v, i) => `${pad + (i / (n - 1)) * (w - pad*2)},${ht - pad - (v / max) * (ht - pad*2)}`).join(' ');
  // grid horizontal (4 linhas)
  const grid = [0.25, 0.5, 0.75, 1].map((f, i) => ({
    y: ht - pad - f * (ht - pad*2),
    v: Math.round(max * f),
    i,
  }));
  return (
    <div>
      <div className="cf-lchart">
        <svg viewBox={`0 0 ${w} ${ht}`} preserveAspectRatio="none">
          {grid.map(g => <g key={g.i}>
            <line x1={pad} y1={g.y} x2={w-pad} y2={g.y} stroke="var(--track)" strokeWidth="1" strokeDasharray="3 4"/>
            <text x={pad-4} y={g.y+3} textAnchor="end" style={{fontSize:9, fill:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>{fmtBRL(g.v, 0).replace('R$ ','')}</text>
          </g>)}
          {/* período B (referência, mais claro, tracejado) */}
          <polyline points={pts(serieB.length===n?serieB:[...serieB, ...Array(n-serieB.length).fill(0)])}
            fill="none" stroke="color-mix(in oklab, var(--text) 35%, transparent)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round"/>
          {/* período A (destaque) */}
          <polyline points={pts(serieA.length===n?serieA:[...serieA, ...Array(n-serieA.length).fill(0)])}
            fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="cf-lchart-legend">
        <div className="cf-lchart-leg"><span className="cf-lchart-leg-dot" style={{background:'var(--brand)'}}/>{labelA}</div>
        <div className="cf-lchart-leg"><span className="cf-lchart-leg-dot" style={{background:'color-mix(in oklab, var(--text) 35%, transparent)'}}/>{labelB}</div>
      </div>
    </div>
  );
}

/* ══════════ ABA · COMPARAR ══════════ */
function TabComparar() {
  const meses = useMemo(() => listarMesesRecentes(12), []);
  const [preset, setPreset] = useState('mes_especifico');
  const [mesEscolhido, setMesEscolhido] = useState(meses[0]); // mês atual por padrão
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const params = useMemo(() => computePreset(preset, mesEscolhido), [preset, mesEscolhido]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErro('');
      try {
        const q = `?inicio_a=${iso(params.a_ini)}&fim_a=${iso(params.a_fim)}&inicio_b=${iso(params.b_ini)}&fim_b=${iso(params.b_fim)}`;
        const d = await api.get(`/relatorios/comparar-periodos${q}`);
        if (!cancel) setDados(d);
      } catch (e) {
        if (!cancel) setErro(e.message || 'Erro ao comparar períodos');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [preset, params]);

  if (loading) return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
      <div className="cf-skel" style={{height:280}}/>
    </>
  );
  if (erro) return <div className="cf-rel-err">⚠ {erro}</div>;
  if (!dados) return null;

  const A = dados.periodo_a, B = dados.periodo_b, V = dados.variacao;
  const KPIS = [
    { tone: 't-brand', lbl: 'Receita',       val: fmtBRL(A.receita, 0), vs: fmtBRL(B.receita, 0), delta: V.receita_pct },
    { tone: 't-ok',    lbl: 'Lucro',         val: fmtBRL(A.lucro, 0),   vs: fmtBRL(B.lucro, 0),   delta: V.lucro_pct },
    { tone: 't-info',  lbl: 'Pedidos',       val: fmtNum(A.pedidos),    vs: fmtNum(B.pedidos),    delta: V.pedidos_pct },
    { tone: 't-warn',  lbl: 'Ticket médio',  val: fmtBRL(A.ticket, 0),  vs: fmtBRL(B.ticket, 0),  delta: V.ticket_pct },
  ];

  return (
    <>
      <div className="cf-rp-toolbar">
        <div className="cf-rp-chips">
          {PRESETS.map(p => <button key={p.key} className={`cf-rp-chip${preset===p.key?' on':''}`} onClick={()=>setPreset(p.key)}>{p.label}</button>)}
        </div>
        {preset === 'mes_especifico' && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>Mês:</span>
            <select className="cf-rp-select"
              value={`${mesEscolhido.ano}-${mesEscolhido.mes}`}
              onChange={e => { const [ano,mes] = e.target.value.split('-').map(Number); setMesEscolhido(meses.find(m=>m.ano===ano&&m.mes===mes) || meses[0]); }}>
              {meses.map(m => <option key={`${m.ano}-${m.mes}`} value={`${m.ano}-${m.mes}`}>{m.label}</option>)}
            </select>
          </div>
        )}
        <div style={{marginLeft:'auto',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div className="cf-rp-date"><div className="cf-rp-date-l">Período A</div>{params.labelA}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>vs</div>
          <div className="cf-rp-date"><div className="cf-rp-date-l">Período B</div>{params.labelB}</div>
        </div>
      </div>

      <div className="cf-cmp-kpis">
        {KPIS.map(k => {
          const tone = toneOf(k.delta);
          return (
            <div key={k.lbl} className={`cf-cmp-kpi ${k.tone}`}>
              <div className="cf-cmp-lbl">{k.lbl}</div>
              <div className="cf-cmp-val">{k.val}</div>
              <div className="cf-cmp-vs">
                <span className={`cf-cmp-delta ${tone}`}>
                  {k.delta==null ? '—' : k.delta > 0 ? <Ic d={ICONS.up} size={11}/> : k.delta < 0 ? <Ic d={ICONS.down} size={11}/> : null}
                  {k.delta==null ? '' : fmtDelta(k.delta)}
                </span>
                <span className="cf-cmp-vs-v">vs {k.vs}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cf-card">
        <div className="cf-card-head">
          <div>
            <div className="cf-card-title">Curva de receita — período A vs B</div>
            <div className="cf-card-sub">receita por dia · {A.dias} dia(s) em A · {B.dias} dia(s) em B</div>
          </div>
        </div>
        <div className="cf-card-pad">
          <LineChart serieA={dados.serie_a} serieB={dados.serie_b} labelA={params.labelA} labelB={params.labelB}/>
        </div>
      </div>

      <div className="cf-row cf-row-1-1">
        <div className="cf-card">
          <div className="cf-card-head">
            <div>
              <div className="cf-card-title">Produtos que mais cresceram</div>
              <div className="cf-card-sub">variação de receita entre os períodos</div>
            </div>
          </div>
          {dados.produtos_subiram.length === 0 ? <div className="cf-rp-empty">Nenhum produto subiu no período</div> :
            <div className="cf-mov-list">
              {dados.produtos_subiram.map(p => (
                <div key={p.id} className="cf-mov-row">
                  <span className="cf-mov-icb up"><Ic d={ICONS.up} size={14}/></span>
                  <div className="cf-mov-nm">{p.nome}</div>
                  <div className="cf-mov-vals">
                    <span className="cf-mov-vals-r up">+{fmtBRL(p.delta_valor, 0)}</span>
                    <span className="cf-mov-vals-s">{p.qtd_a} un · antes {p.qtd_b} un</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="cf-card">
          <div className="cf-card-head">
            <div>
              <div className="cf-card-title">Produtos que mais caíram</div>
              <div className="cf-card-sub">merecem atenção</div>
            </div>
          </div>
          {dados.produtos_cairam.length === 0 ? <div className="cf-rp-empty">Nenhum produto caiu no período</div> :
            <div className="cf-mov-list">
              {dados.produtos_cairam.map(p => (
                <div key={p.id} className="cf-mov-row">
                  <span className="cf-mov-icb dn"><Ic d={ICONS.down} size={14}/></span>
                  <div className="cf-mov-nm">{p.nome}</div>
                  <div className="cf-mov-vals">
                    <span className="cf-mov-vals-r dn">{fmtBRL(p.delta_valor, 0)}</span>
                    <span className="cf-mov-vals-s">{p.qtd_a} un · antes {p.qtd_b} un</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </>
  );
}

/* ══════════ ABA · A RECEBER ══════════ */
function TabAReceber() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [valorMin, setValorMin] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErro('');
      try { const d = await api.get('/relatorios/a-receber'); if (!cancel) setDados(d); }
      catch (e) { if (!cancel) setErro(e.message || 'Erro'); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 3fr',gap:16}}>
        <div className="cf-skel" style={{height:120}}/>
        <div className="cf-skel" style={{height:120}}/>
      </div>
      <div className="cf-skel" style={{height:280}}/>
    </>
  );
  if (erro) return <div className="cf-rel-err">⚠ {erro}</div>;
  if (!dados) return null;

  const T = dados.totais;
  const total = T.geral || 0;
  const pct = (v) => total > 0 ? Math.round((v/total)*100) : 0;
  const devedores = dados.devedores || [];

  const BUCKETS = [
    { k: 'a_vencer',        cls: 't-ok',   lbl: 'A vencer',        v: T.a_vencer },
    { k: 'vencido_30',      cls: 't-warn', lbl: 'Vencido até 30d', v: T.vencido_30 },
    { k: 'vencido_60',      cls: 't-crit', lbl: 'Vencido 30–60d',  v: T.vencido_60 },
    { k: 'vencido_60_mais', cls: 't-dark', lbl: 'Vencido +60d',    v: T.vencido_60_mais },
  ];

  const filtrados = devedores.filter(d => {
    if (filtro === 'em_dia' && d.atraso_max !== 0) return false;
    if (filtro === 'atrasado_30' && !(d.atraso_max > 0 && d.atraso_max <= 30)) return false;
    if (filtro === 'atrasado_60' && !(d.atraso_max > 30 && d.atraso_max <= 60)) return false;
    if (filtro === 'atrasado_60_mais' && !(d.atraso_max > 60)) return false;
    if (busca && !d.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    const min = parseFloat(valorMin) || 0;
    if (min > 0 && d.saldo_total < min) return false;
    return true;
  });

  const CHIPS = [
    { k: 'todos',            lbl: 'Todos',        n: devedores.length },
    { k: 'em_dia',           lbl: 'A vencer',     n: devedores.filter(d => d.atraso_max === 0).length },
    { k: 'atrasado_30',      lbl: 'Até 30 dias',  n: devedores.filter(d => d.atraso_max > 0 && d.atraso_max <= 30).length },
    { k: 'atrasado_60',      lbl: '30–60 dias',   n: devedores.filter(d => d.atraso_max > 30 && d.atraso_max <= 60).length },
    { k: 'atrasado_60_mais', lbl: 'Mais de 60d',  n: devedores.filter(d => d.atraso_max > 60).length },
  ];

  return (
    <>
      <div className="cf-rec-hero">
        <div className="cf-rec-total">
          <div className="cf-rec-total-l">Total a receber</div>
          <div className="cf-rec-total-v">{fmtBRL(total)}</div>
          <div className="cf-rec-total-s">{devedores.length} cliente(s) com saldo aberto</div>
        </div>
        <div className="cf-rec-buckets">
          {BUCKETS.map(b => (
            <div key={b.k} className={`cf-rec-bucket ${b.cls}`}>
              <div className="cf-rec-bucket-l">{b.lbl}</div>
              <div className="cf-rec-bucket-v">{fmtBRL(b.v, 0)}</div>
              <div className="cf-rec-bucket-p">{pct(b.v)}% do total</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cf-rp-toolbar">
        <div className="cf-rp-chips">
          {CHIPS.map(c => <button key={c.k} className={`cf-rp-chip${filtro===c.k?' on':''}`} onClick={()=>setFiltro(c.k)}>{c.lbl} · {c.n}</button>)}
        </div>
        <div className="cf-rp-search">
          <Ic d={ICONS.target} size={14}/>
          <input placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)}/>
          {busca && <button className="x" onClick={()=>setBusca('')}>×</button>}
        </div>
        <div className="cf-rp-minval">
          <span className="cf-rp-minval-l">Saldo ≥ R$</span>
          <input type="number" min="0" step="10" placeholder="0" value={valorMin} onChange={e => setValorMin(e.target.value)}/>
        </div>
      </div>

      <div className="cf-rec-table">
        <div className="cf-rec-thead">
          <div className="cf-rec-th">Cliente</div>
          <div className="cf-rec-th r">Parcelas</div>
          <div className="cf-rec-th r">Atraso</div>
          <div className="cf-rec-th r">Saldo</div>
          <div className="cf-rec-th r">Ação</div>
        </div>
        {filtrados.length === 0 ? <div className="cf-rp-empty">Nenhum cliente neste filtro</div> :
          filtrados.map(d => {
            const atrasoCls = d.atraso_max === 0 ? 'ok' : d.atraso_max <= 30 ? 'warn' : 'crit';
            return (
              <div key={d.id} className="cf-rec-row">
                <div className="cf-rec-cli">
                  <span className="cf-rec-avatar">{inicial(d.nome)}</span>
                  <div style={{minWidth:0}}>
                    <div className="cf-rec-nm">{d.nome}</div>
                    <div className="cf-rec-nm-sub">{d.telefone || '—'}{d.primeira_vencida ? ` · desde ${d.primeira_vencida}` : ''}</div>
                  </div>
                </div>
                <div className="cf-rec-cell r"><span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-dim)'}}>{d.parcelas_abertas} aberta(s)</span></div>
                <div className="cf-rec-cell r">
                  <span className={`cf-rec-atraso ${atrasoCls}`}>
                    {d.atraso_max === 0 ? 'em dia' : `${d.atraso_max}d`}
                  </span>
                </div>
                <div className="cf-rec-cell r"><span className="cf-rec-saldo">{fmtBRL(d.saldo_total, 0)}</span></div>
                <div className="cf-rec-cell r">
                  {d.telefone ? (
                    <a className="cf-rec-wa" href={waLink(d.nome, d.telefone, d.saldo_total, d.atraso_max)} target="_blank" rel="noreferrer">
                      <Ic d={ICONS.wa} size={13}/> Cobrar
                    </a>
                  ) : <span style={{fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>sem tel</span>}
                </div>
              </div>
            );
          })
        }
      </div>
    </>
  );
}

/* ══════════ ABA · PRODUTOS ══════════ */
function TabProdutos() {
  const meses = useMemo(() => listarMesesRecentes(12), []);
  const [modo, setModo] = useState('dias'); // 'dias' | 'mes'
  const [dias, setDias] = useState('30');
  const [mesEscolhido, setMesEscolhido] = useState(meses[0]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('');
  const [valorMin, setValorMin] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErro('');
      try {
        const q = modo === 'mes'
          ? `?mes=${mesEscolhido.mes}&ano=${mesEscolhido.ano}`
          : `?dias=${dias}`;
        const p = await api.get(`/relatorios/produtos-mais-vendidos${q}`);
        if (!cancel) setProdutos(Array.isArray(p) ? p : []);
      } catch (e) { if (!cancel) setErro(e.message || 'Erro'); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [modo, dias, mesEscolhido]);

  const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['365', '1 ano']];

  // aplica filtros locais em cima do que voltou do backend
  const produtosFiltrados = useMemo(() => {
    const min = parseFloat(valorMin) || 0;
    const b = busca.trim().toLowerCase();
    return produtos.filter(p => {
      if (catFiltro && (p.categoria || 'Sem categoria') !== catFiltro) return false;
      if (min > 0 && (p.receita || 0) < min) return false;
      if (b && !((p.nome || '').toLowerCase().includes(b) || (p.sku || '').toLowerCase().includes(b))) return false;
      return true;
    });
  }, [produtos, busca, catFiltro, valorMin]);

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set(produtos.map(p => p.categoria || 'Sem categoria'));
    return [...set].sort();
  }, [produtos]);

  const totalUn = produtosFiltrados.reduce((a, p) => a + (p.qtd_vendida||0), 0);
  const totalRec = produtosFiltrados.reduce((a, p) => a + (p.receita||0), 0);
  const totalLucro = produtosFiltrados.reduce((a, p) => a + (p.lucro||0), 0);
  const porQtd = [...produtosFiltrados].sort((a, b) => (b.qtd_vendida||0) - (a.qtd_vendida||0));
  const porLucro = [...produtosFiltrados].sort((a, b) => (b.lucro||0) - (a.lucro||0));
  const maxQtd = Math.max(...porQtd.map(p => p.qtd_vendida||0), 1);
  const maxLucro = Math.max(...porLucro.map(p => p.lucro||0), 1);

  // "Oportunidades" — margem alta (>=40%) mas venda abaixo da mediana em quantidade
  const medQtd = (() => {
    if (produtosFiltrados.length === 0) return 0;
    const arr = [...produtosFiltrados].map(p => p.qtd_vendida||0).sort((a,b)=>a-b);
    return arr[Math.floor(arr.length/2)];
  })();
  const oportunidades = produtosFiltrados
    .filter(p => (p.margem||0) >= 40 && (p.qtd_vendida||0) < medQtd)
    .sort((a,b) => (b.margem||0) - (a.margem||0));

  const margemCls = (m) => m >= 40 ? 'high' : m >= 20 ? 'mid' : 'low';
  const KPIS = [
    { tone: 't-brand', lbl: 'Produtos vendidos',  val: produtosFiltrados.length, sub: 'com saída no período' },
    { tone: 't-info',  lbl: 'Unidades vendidas',  val: fmtNum(totalUn),        sub: 'total de itens' },
    { tone: 't-ok',    lbl: 'Receita gerada',     val: fmtBRL(totalRec, 0),    sub: `lucro ${fmtBRL(totalLucro, 0)}` },
    { tone: 't-warn',  lbl: 'Mais vendido',       val: porQtd[0]?.qtd_vendida || 0, sub: porQtd[0]?.nome || '—' },
  ];

  return (
    <>
      <div className="cf-rp-toolbar">
        <div className="cf-rp-chips">
          <button className={`cf-rp-chip${modo==='dias'?' on':''}`} onClick={()=>setModo('dias')}>Últimos dias</button>
          <button className={`cf-rp-chip${modo==='mes'?' on':''}`} onClick={()=>setModo('mes')}>Mês específico</button>
        </div>
        {modo === 'dias' ? (
          <div className="cf-rp-chips">
            {PERIODOS.map(([v, l]) => <button key={v} className={`cf-rp-chip${dias===v?' on':''}`} onClick={()=>setDias(v)}>{l}</button>)}
          </div>
        ) : (
          <select className="cf-rp-select"
            value={`${mesEscolhido.ano}-${mesEscolhido.mes}`}
            onChange={e => { const [ano,mes] = e.target.value.split('-').map(Number); setMesEscolhido(meses.find(m=>m.ano===ano&&m.mes===mes) || meses[0]); }}>
            {meses.map(m => <option key={`${m.ano}-${m.mes}`} value={`${m.ano}-${m.mes}`}>{m.label}</option>)}
          </select>
        )}
        <div className="cf-rp-search">
          <Ic d={ICONS.target} size={14}/>
          <input placeholder="Buscar produto ou SKU…" value={busca} onChange={e => setBusca(e.target.value)}/>
          {busca && <button className="x" onClick={()=>setBusca('')}>×</button>}
        </div>
        {categoriasDisponiveis.length > 0 && (
          <select className="cf-rp-select" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
            <option value="">Todas categorias</option>
            {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="cf-rp-minval">
          <span className="cf-rp-minval-l">Receita ≥ R$</span>
          <input type="number" min="0" step="50" placeholder="0" value={valorMin} onChange={e => setValorMin(e.target.value)}/>
        </div>
      </div>

      {loading ? (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:100}}/>)}</div>
          <div className="cf-skel" style={{height:280}}/>
        </>
      ) : erro ? <div className="cf-rel-err">⚠ {erro}</div> : (
        <>
          <div className="cf-pr-kpis">
            {KPIS.map(k => (
              <div key={k.lbl} className={`cf-pr-kpi ${k.tone}`}>
                <div className="cf-pr-kpi-lbl">{k.lbl}</div>
                <div className="cf-pr-kpi-val">{k.val}</div>
                <div className="cf-pr-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {oportunidades.length > 0 && (
            <div className="cf-pr-oport">
              <span className="cf-pr-oport-ic"><Ic d={ICONS.gem} size={17}/></span>
              <div style={{flex:1,minWidth:0}}>
                <div className="cf-pr-oport-t">Oportunidade: {oportunidades.length} produto(s) com margem alta e pouca venda</div>
                <div className="cf-pr-oport-s">Produtos com margem ≥ 40% que vendem abaixo da mediana — potencial de crescimento com promoção ou destaque na vitrine.</div>
              </div>
            </div>
          )}

          <div className="cf-row cf-row-1-1">
            <div className="cf-card">
              <div className="cf-card-head">
                <div>
                  <div className="cf-card-title">Mais vendidos <span style={{color:'var(--text-muted)',fontWeight:500}}>· quantidade</span></div>
                  <div className="cf-card-sub">o que sai mais rápido do estoque</div>
                </div>
              </div>
              {porQtd.length === 0 ? <div className="cf-rp-empty">Sem vendas no período</div> : porQtd.slice(0, 8).map((p, i) => (
                <div key={p.id} className="cf-top-row">
                  <span className="cf-rank">{i + 1}</span>
                  <div className="cf-top-main">
                    <div className="cf-top-name">{p.nome}</div>
                    <div className="cf-top-cat">{p.categoria || 'Sem categoria'}</div>
                    <div className="cf-top-bar"><div className="cf-top-fill" style={{ width: `${(p.qtd_vendida / maxQtd) * 100}%` }}/></div>
                  </div>
                  <div className="cf-top-val">{p.qtd_vendida} un</div>
                </div>
              ))}
            </div>

            <div className="cf-card">
              <div className="cf-card-head">
                <div>
                  <div className="cf-card-title">Mais lucrativos <span style={{color:'var(--text-muted)',fontWeight:500}}>· lucro absoluto</span></div>
                  <div className="cf-card-sub">o que mais gera lucro no total</div>
                </div>
              </div>
              {porLucro.length === 0 ? <div className="cf-rp-empty">Sem vendas no período</div> : porLucro.slice(0, 8).map((p, i) => (
                <div key={p.id} className="cf-top-row">
                  <span className="cf-rank">{i + 1}</span>
                  <div className="cf-top-main">
                    <div className="cf-top-name">{p.nome}</div>
                    <div className="cf-top-cat">margem {Number(p.margem||0).toFixed(0)}%</div>
                    <div className="cf-top-bar"><div className="cf-top-fill ok" style={{ width: `${(p.lucro / maxLucro) * 100}%` }}/></div>
                  </div>
                  <div className="cf-top-val" style={{color:'var(--ok)'}}>{fmtBRL(p.lucro, 0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cf-pr-table">
            <div className="cf-card-head" style={{borderBottom:'1px solid var(--border)'}}>
              <div>
                <div className="cf-card-title">Detalhamento por produto</div>
                <div className="cf-card-sub">{produtos.length} produto(s) com vendas · ordenados por lucro absoluto</div>
              </div>
            </div>
            <div className="cf-pr-thead">
              <div className="cf-pr-th">#</div>
              <div className="cf-pr-th">Produto</div>
              <div className="cf-pr-th">Categoria</div>
              <div className="cf-pr-th r">Qtd</div>
              <div className="cf-pr-th r">Receita</div>
              <div className="cf-pr-th r">Custo</div>
              <div className="cf-pr-th r">Lucro</div>
              <div className="cf-pr-th r">Margem</div>
            </div>
            {porLucro.length === 0 ? <div className="cf-rp-empty">Nenhum produto com vendas</div> : porLucro.map((p, i) => {
              const oport = (p.margem||0) >= 40 && (p.qtd_vendida||0) < medQtd;
              return (
                <div key={p.id} className={`cf-pr-trow${oport?' oport':''}`}>
                  <div className="cf-pr-cell"><span className="cf-pr-num" style={{fontWeight:700,color:i<3?'var(--brand)':'var(--text-muted)'}}>{i + 1}</span></div>
                  <div className="cf-pr-cell" style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nome}</div>
                    {oport && <div className="cf-pr-oport-tag"><Ic d={ICONS.gem} size={10}/> oportunidade</div>}
                  </div>
                  <div className="cf-pr-num">{p.categoria || 'Sem cat.'}</div>
                  <div className="cf-pr-num r">{p.qtd_vendida}</div>
                  <div className="cf-pr-num r">{fmtBRL(p.receita, 0)}</div>
                  <div className="cf-pr-num r warn">{fmtBRL(p.custo, 0)}</div>
                  <div className="cf-pr-num r ok">{fmtBRL(p.lucro, 0)}</div>
                  <div className="cf-pr-cell r"><span className={`cf-pr-margin ${margemCls(p.margem)}`}>{Number(p.margem||0).toFixed(1)}%</span></div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
const TABS = [
  { key: 'comparar',  label: 'Comparar',  ic: 'compare' },
  { key: 'a_receber', label: 'A Receber', ic: 'wallet' },
  { key: 'produtos',  label: 'Produtos',  ic: 'box' },
];

export default function Relatorios() {
  const [theme, setTheme] = useState(getDocTheme);
  const [aba, setAba] = useState('comparar');

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  return (
    <div className="cf-rel-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-rel">

        <div className="cf-rp-head">
          <div>
            <div className="cf-rp-head-t">Relatórios & análises</div>
            <div className="cf-rp-head-sub">decisões rápidas para a revisão semanal · {TABS.find(t => t.key === aba)?.label.toLowerCase()}</div>
          </div>
          <div className="cf-rp-tabs">
            {TABS.map(t => (
              <button key={t.key} className={aba === t.key ? 'on' : ''} onClick={() => setAba(t.key)}>
                <span style={{display:'flex'}}><Ic d={ICONS[t.ic]} size={14}/></span>{t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cf-rp-body" key={aba}>
          {aba === 'comparar'  && <TabComparar/>}
          {aba === 'a_receber' && <TabAReceber/>}
          {aba === 'produtos'  && <TabProdutos/>}
        </div>
      </div>
    </div>
  );
}