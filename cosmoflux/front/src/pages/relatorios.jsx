import { useState, useEffect, useMemo, useCallback } from 'react';

/* ── API ──────────────────────────────────────────────────────────────── */
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = {
  get: url => fetch(BASE+url,{headers:h()}).then(async r=>{const d=await r.json().catch(()=>([]));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };

/* ── helpers ──────────────────────────────────────────────────────────── */
const fmtBRL = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtNum = (v) => Number(v || 0).toLocaleString('pt-BR');
const fmtPctR = (v) => Math.round(Number(v || 0)) + '%';
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const ENT_META = {
  entregue:         { cls: 'ok',   label: 'Entregue',  color: 'var(--ok)' },
  pendente_entrega: { cls: 'warn', label: 'Pendente',  color: 'var(--warn)' },
  concluido:        { cls: 'ok',   label: 'Concluído', color: 'var(--ok)' },
  pendente:         { cls: 'warn', label: 'Pendente',  color: 'var(--warn)' },
  cancelado:        { cls: 'crit', label: 'Cancelado', color: 'var(--crit)' },
};
const PAG_META = {
  pago:      { cls: 'ok',   label: 'Pago',      color: 'var(--ok)' },
  em_aberto: { cls: 'warn', label: 'Em aberto', color: 'var(--warn)' },
  vencido:   { cls: 'crit', label: 'Vencido',   color: 'var(--crit)' },
  cancelado: { cls: 'info', label: 'Cancelado', color: 'var(--brand)' },
};

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>
    {d}
  </svg>
);
const ICONS = {
  grid:    <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  cart:    <><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2 3h3l3 12h12l2-8H6"/></>,
  layers:  <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
  box:     <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></>,
  chart:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  spark:   <path d="M12 2.5 14.2 9 21 11l-6.8 2L12 19.5 9.8 13 3 11l6.8-2L12 2.5Z"/>,
  bell:    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  tag:     <><path d="M20.59 13.41 11 23l-9-9 9.59-9.59a2 2 0 0 1 1.41-.41H20a2 2 0 0 1 2 2v6.18a2 2 0 0 1-.41 1.41Z"/><circle cx="16.5" cy="7.5" r="1.5"/></>,
  arrowIn: <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
  arrowOut:<><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>,
};

/* ── sparkline ────────────────────────────────────────────────────────── */
function Spark({ data, color }) {
  if (!data || data.length < 2 || !data.some(v => v > 0)) return null;
  const w = 64, ht = 26, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${ht - ((v - min) / range) * (ht - 3) - 1.5}`).join(' ');
  return <svg width={w} height={ht} viewBox={`0 0 ${w} ${ht}`} style={{ display: 'block', overflow: 'visible' }}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
  </svg>;
}

/* ── bar chart mensal ─────────────────────────────────────────────────── */
function BarChart({ data, mesAtual }) {
  const max = Math.max(...data.map(m => m.total), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:170}}>
      {data.map((m, i) => {
        const h = Math.max((m.total / max) * 100, m.total > 0 ? 2 : 0);
        const now = i === mesAtual;
        return (
          <div key={i} style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',alignItems:'center',gap:8,height:'100%'}}>
            <div style={{flex:1,width:'100%',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div title={`${MESES[i]}: ${fmtBRL(m.total,0)}`}
                style={{width:'80%',maxWidth:34,height:`${h}%`,borderRadius:'5px 5px 0 0',
                background: now ? 'var(--brand)' : 'color-mix(in oklab, var(--brand) 45%, transparent)',
                transition:'height .7s cubic-bezier(.22,1,.36,1)',transitionDelay:`${i*0.03}s`}}/>
            </div>
            <div style={{fontSize:9.5,fontFamily:'var(--font-mono)',color: now ? 'var(--brand)' : 'var(--text-muted)', fontWeight: now ? 700 : 400}}>{MESES[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── donut de categorias ──────────────────────────────────────────────── */
function Donut({ items, size = 148 }) {
  const total = items.reduce((a, x) => a + x.valor, 0);
  if (total === 0) return <div style={{width:size,height:size,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:11}}>sem dados</div>;
  const cx = size/2, cy = size/2, r = size/2 - 12, sw = 20;
  let acc = 0;
  const segs = items.map((it, i) => {
    const frac = it.valor / total;
    const start = acc * 2 * Math.PI - Math.PI/2;
    const end = (acc + frac) * 2 * Math.PI - Math.PI/2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
    const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
    acc += frac;
    return { d:`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: `var(--cat-${i%5})`, i };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={sw}/>
      {segs.map(s => <path key={s.i} d={s.d} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="butt"/>)}
      <text x={cx} y={cy-4} textAnchor="middle" style={{fontSize:11,fill:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>total</text>
      <text x={cx} y={cy+13} textAnchor="middle" style={{fontSize:14,fontWeight:800,fill:'var(--text)',fontFamily:'var(--font-mono)'}}>{fmtBRL(total,0)}</text>
    </svg>
  );
}

/* ── mini barra horizontal ────────────────────────────────────────────── */
function MiniBar({ label, val, max, color, right }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{fontSize:12,fontWeight:600,color:'var(--text-dim)',minWidth:96}}>{label}</div>
      <div style={{flex:1,height:8,background:'var(--track)',borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:4,background:color,width:`${(val/max)*100}%`,transition:'width .8s cubic-bezier(.22,1,.36,1)'}}/>
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:11.5,color:'var(--text-muted)',minWidth:96,textAlign:'right'}}>{right}</div>
    </div>
  );
}

/* ── pill ─────────────────────────────────────────────────────────────── */
const Pill = ({ s, meta }) => { const m = meta[s] || Object.values(meta)[0]; return <span className={`cf-pill ${m.cls}`}>{m.label}</span>; };

/* ── medidor de estoque ───────────────────────────────────────────────── */
function StockMeter({ atual, minimo }) {
  const st = atual === 0 ? 'crit' : atual <= minimo ? 'warn' : 'ok';
  const pct = Math.min((atual / Math.max(minimo * 2.5, atual, 1)) * 100, 100);
  const cor = st === 'crit' ? 'var(--crit)' : st === 'warn' ? 'var(--warn)' : 'var(--ok)';
  return <div style={{width:74,height:5,background:'var(--track)',borderRadius:3,overflow:'hidden'}}>
    <div style={{height:'100%',background:cor,width:pct+'%',borderRadius:3,transition:'width .5s'}}/>
  </div>;
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
.cf-card.glow{background:linear-gradient(150deg,color-mix(in oklab,var(--brand) 7%,var(--surface)),var(--surface));}
.cf-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:var(--card-pad) var(--card-pad) 10px;}
.cf-card-title{font-size:14px;font-weight:800;}
.cf-card-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.cf-card-pad{padding:14px var(--card-pad) var(--card-pad);}
.cf-row{display:grid;gap:var(--gap);}
.cf-row-2-1{grid-template-columns:2fr 1fr;}
.cf-row-1-1{grid-template-columns:1fr 1fr;}
@media(max-width:1000px){.cf-row-2-1,.cf-row-1-1{grid-template-columns:1fr;}}
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
.cf-rel-root[data-theme="light"] .cf-rp-tabs button.on{color:color-mix(in oklab,var(--brand) 78%,#000);}

.cf-rp-chips{display:flex;gap:6px;flex-wrap:wrap;}
.cf-rp-chip{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:all .15s;}
.cf-rp-chip:hover:not(.on){color:var(--text);border-color:var(--border-strong);}
.cf-rp-chip.on{background:var(--brand-soft);border-color:var(--brand-line);color:var(--brand);}

.cf-rp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--card-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-kpi.tone-info{--tone:#3b82f6;}
.cf-kpi.tone-warn{--tone:var(--warn);}
.cf-kpi.tone-crit{--tone:var(--crit);}
.cf-kpi.tone-brand{--tone:var(--brand);}
.cf-kpi.tone-ok{--tone:var(--ok);}
.cf-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}

.cf-rp-body{display:flex;flex-direction:column;gap:var(--gap);animation:cfrUp .35s cubic-bezier(.22,1,.36,1);}

.cf-rp-totais{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px var(--card-pad) var(--card-pad);}
.cf-rp-tot{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;position:relative;overflow:hidden;}
.cf-rp-tot::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tot,var(--brand));opacity:.85;}
.cf-rp-tot-l{font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:7px;}
.cf-rp-tot-v{font-size:24px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}

.cf-rp-mini{display:flex;flex-direction:column;gap:11px;padding:14px var(--card-pad) var(--card-pad);}
.cf-rp-subhead{padding:14px var(--card-pad) 0;border-top:1px solid var(--border);margin-top:4px;}
.cf-rp-subhead-t{font-size:12px;font-weight:700;}

.cf-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-pill.crit{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
.cf-pill.info{background:var(--brand-soft);color:var(--brand);}

.cf-rp-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.cf-rp-table-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:var(--card-pad) var(--card-pad) 14px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.cf-rp-thead,.cf-rp-row{display:grid;align-items:center;gap:12px;padding:0 18px;}
.cf-rp-thead{height:42px;border-bottom:1px solid var(--border);}
.cf-rp-th{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-rp-th.r,.cf-rp-cell.r{text-align:right;justify-self:end;}
.cf-rp-row{min-height:56px;border-bottom:1px solid var(--border);transition:background .12s;}
.cf-rp-row:last-child{border-bottom:none;}
.cf-rp-row:hover{background:color-mix(in oklab,var(--text) 3%,transparent);}
.cf-rp-num{font-family:var(--font-mono);font-size:12.5px;color:var(--text-dim);}
.cf-rp-num.r{text-align:right;justify-self:end;}
.cf-rp-num.ok{color:var(--ok);font-weight:700;}
.cf-rp-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-rp-name-sub{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-rp-id{font-family:var(--font-mono);font-size:12px;color:var(--text-muted);}
.cf-rp-empty{padding:48px 20px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;}
.cf-rp-table.vendas .cf-rp-thead,.cf-rp-table.vendas .cf-rp-row{grid-template-columns:52px minmax(160px,1.5fr) 0.6fr 96px 96px 0.9fr 108px;}
.cf-rp-table.estoque .cf-rp-thead,.cf-rp-table.estoque .cf-rp-row{grid-template-columns:minmax(190px,1.8fr) 0.9fr 80px 120px 1fr 96px;}
.cf-rp-stock{display:flex;align-items:center;gap:10px;}
.cf-rp-stock-n{font-family:var(--font-mono);font-size:12.5px;font-weight:700;min-width:40px;}
.cf-rp-cli{display:flex;align-items:center;gap:10px;min-width:0;}
.cf-rp-avatar{width:30px;height:30px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(140deg,color-mix(in oklab,var(--brand) 72%,#7a4df0),var(--brand));}
.cf-rp-avatar.balcao{background:var(--surface-2);color:var(--text-muted);border:1px dashed var(--border-strong);}

.cf-top-row{display:flex;align-items:center;gap:12px;padding:11px var(--card-pad);border-bottom:1px solid var(--border);}
.cf-top-row:last-child{border-bottom:none;}
.cf-rank{font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--brand);min-width:18px;}
.cf-top-main{flex:1;min-width:0;}
.cf-top-name{font-size:12.5px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-top-bar{height:5px;background:var(--track);border-radius:3px;overflow:hidden;}
.cf-top-fill{height:100%;background:var(--brand);border-radius:3px;transition:width .8s cubic-bezier(.22,1,.36,1);}
.cf-top-val{font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted);white-space:nowrap;}
.cf-mov-row{display:flex;align-items:center;gap:11px;padding:11px var(--card-pad);border-bottom:1px solid var(--border);}
.cf-mov-row:last-child{border-bottom:none;}
.cf-mov-ic{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cf-mov-ic.entrada{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-mov-ic.saida{background:color-mix(in oklab,var(--crit) 15%,transparent);color:var(--crit);}
.cf-mov-ic.ajuste{background:color-mix(in oklab,var(--warn) 15%,transparent);color:var(--warn);}
.cf-mov-main{flex:1;min-width:0;}
.cf-mov-prod{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-mov-meta{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-mov-qty{font-family:var(--font-mono);font-size:12.5px;font-weight:700;}
.cf-mov-qty.entrada{color:var(--ok);}
.cf-mov-qty.saida{color:var(--crit);}
.cf-mov-qty.ajuste{color:var(--warn);}

.cf-donut-wrap{display:flex;gap:20px;padding:14px var(--card-pad) var(--card-pad);align-items:center;flex-wrap:wrap;}
.cf-cat-legend{flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px;}
.cf-cat-row{display:grid;grid-template-columns:14px 1fr auto auto;gap:9px;align-items:center;font-size:12px;}
.cf-cat-dot{width:9px;height:9px;border-radius:3px;}
.cf-cat-name{color:var(--text-dim);}
.cf-cat-pct{font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);}
.cf-cat-val{font-family:var(--font-mono);font-size:11.5px;font-weight:700;}

@media(max-width:1200px){.cf-rp-kpis{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.cf-rp-kpis{grid-template-columns:1fr;}}
`;

/* ══════════ ABA · GERAL ══════════ */
function TabGeral({ resumo, mensal }) {
  const cad = resumo?.cadastros || {};
  const fin = resumo?.financeiro || {};
  const topProdutos = resumo?.top_produtos || [];
  const movs = (resumo?.movimentacoes_recentes || []).slice(0, 8);
  const sparkFat = mensal.map(m => m.total || 0);
  const maxTop = Math.max(...topProdutos.map(p => p.qtd_vendida || p.qtd || 0), 1);
  const mesAtual = new Date().getMonth();
  const movIc = { entrada: 'arrowIn', saida: 'arrowOut', ajuste: 'layers' };

  const KPIS = [
    { tone: 'tone-brand', ic: 'chart', val: fmtBRL(fin.receita_total, 0), lbl: 'Receita total', sub: `${fmtNum(cad.pedidos)} pedido(s)`, spark: sparkFat },
    { tone: 'tone-ok',    ic: 'spark', val: fmtBRL(fin.lucro_total, 0), lbl: 'Lucro total', sub: `margem ${fmtPctR(fin.margem)}` },
    { tone: 'tone-info',  ic: 'cart',  val: fmtBRL(fin.ticket_medio, 0), lbl: 'Ticket médio', sub: 'por pedido' },
    { tone: 'tone-warn',  ic: 'layers',val: fmtBRL(fin.valor_estoque, 0), lbl: 'Valor em estoque', sub: `venda ${fmtBRL(fin.valor_estoque_venda, 0)}` },
  ];

  const TOTAIS = [
    { l: 'Clientes',     v: fmtNum(cad.clientes),     c: 'var(--cat-0)' },
    { l: 'Produtos',     v: fmtNum(cad.produtos),     c: 'var(--cat-1)' },
    { l: 'Fornecedores', v: fmtNum(cad.fornecedores), c: 'var(--cat-2)' },
    { l: 'Pedidos',      v: fmtNum(cad.pedidos),      c: 'var(--cat-3)' },
  ];

  return (<>
    <div className="cf-rp-kpis">
      {KPIS.map(k => (
        <div key={k.lbl} className={`cf-kpi ${k.tone}`}>
          <div className="cf-kpi-top">
            <span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span>
            {k.spark && <Spark data={k.spark} color="var(--tone, var(--brand))"/>}
          </div>
          <div className="cf-kpi-val">{k.val}</div>
          <div><div className="cf-kpi-lbl">{k.lbl}</div><div className="cf-kpi-sub">{k.sub}</div></div>
        </div>
      ))}
    </div>

    <div className="cf-row cf-row-2-1">
      <div className="cf-card glow">
        <div className="cf-card-head">
          <div><div className="cf-card-title">Faturamento mensal</div><div className="cf-card-sub">{new Date().getFullYear()} · 12 meses</div></div>
          <div style={{display:'flex',gap:20}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>Melhor mês</div>
              <div style={{fontSize:12,fontFamily:'var(--font-mono)',fontWeight:700}}>{fmtBRL(Math.max(...sparkFat, 0), 0)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>Média</div>
              <div style={{fontSize:12,fontFamily:'var(--font-mono)',fontWeight:700}}>{fmtBRL(sparkFat.reduce((a,b)=>a+b,0)/Math.max(sparkFat.length,1), 0)}</div>
            </div>
          </div>
        </div>
        <div className="cf-card-pad"><BarChart data={mensal.map(m=>({total:m.total||0}))} mesAtual={mesAtual}/></div>
      </div>

      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Totais do sistema</div><div className="cf-card-sub">cadastros ativos</div></div></div>
        <div className="cf-rp-totais">
          {TOTAIS.map(t => (
            <div key={t.l} className="cf-rp-tot" style={{ '--tot': t.c }}>
              <div className="cf-rp-tot-l">{t.l}</div>
              <div className="cf-rp-tot-v">{t.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="cf-row cf-row-1-1">
      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Top 5 produtos</div><div className="cf-card-sub">por quantidade vendida</div></div></div>
        {topProdutos.length === 0 ? <div className="cf-rp-empty">Sem vendas ainda</div> : topProdutos.slice(0,5).map((p, i) => {
          const qtd = p.qtd_vendida || p.qtd || 0;
          return (
            <div key={p.id || i} className="cf-top-row">
              <span className="cf-rank">{i + 1}</span>
              <div className="cf-top-main">
                <div className="cf-top-name">{p.nome}</div>
                <div className="cf-top-bar"><div className="cf-top-fill" style={{ width: `${(qtd / maxTop) * 100}%` }} /></div>
              </div>
              <div className="cf-top-val">{qtd} un.</div>
            </div>
          );
        })}
      </div>

      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Movimentações recentes</div><div className="cf-card-sub">entradas, saídas e ajustes</div></div></div>
        {movs.length === 0 ? <div className="cf-rp-empty">Nenhuma movimentação recente</div> : movs.map((m, i) => (
          <div key={i} className="cf-mov-row">
            <span className={`cf-mov-ic ${m.tipo}`}><Ic d={ICONS[movIc[m.tipo] || 'layers']} size={14}/></span>
            <div className="cf-mov-main">
              <div className="cf-mov-prod">{m.produto || 'Produto'}</div>
              <div className="cf-mov-meta">{m.motivo || '—'} · {m.data || '—'}</div>
            </div>
            <div className={`cf-mov-qty ${m.tipo}`}>{m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '−' : '±'}{m.quantidade}</div>
          </div>
        ))}
      </div>
    </div>
  </>);
}

/* ══════════ ABA · VENDAS ══════════ */
function TabVendas({ vendas, resumo }) {
  const [filtro, setFiltro] = useState('todos');

  const totalVendas = vendas.length;
  const faturamento = vendas.reduce((a,v)=>a+(v.total||0), 0);
  const lucroEstimado = vendas.reduce((a,v)=>a+(v.lucro||0), 0);
  const ticket = totalVendas ? faturamento / totalVendas : 0;

  const porEntrega = ['concluido', 'pendente', 'cancelado'].map(s => ({
    key: s, ...(ENT_META[s]||ENT_META.pendente), val: vendas.filter(v => v.status_entrega === s).length,
  }));
  const porPag = ['pago', 'em_aberto', 'vencido'].map(s => ({
    key: s, ...PAG_META[s], val: vendas.filter(v => v.status_pagamento === s).length,
  }));
  const modosSet = [...new Set(vendas.map(v => v.modo_pagamento).filter(Boolean))];
  const porModo = modosSet.map(m => ({
    label: m, val: vendas.filter(v => v.modo_pagamento === m).length,
    receita: vendas.filter(v => v.modo_pagamento === m).reduce((a, v) => a + (v.total||0), 0),
  })).sort((a, b) => b.val - a.val);

  const maxEnt = Math.max(...porEntrega.map(x => x.val), 1);
  const maxPag = Math.max(...porPag.map(x => x.val), 1);
  const maxModo = Math.max(...porModo.map(x => x.val), 1);

  const FILTROS = [
    { k: 'todos',     label: 'Todos',     n: vendas.length },
    { k: 'pago',      label: 'Pagos',     n: vendas.filter(v => v.status_pagamento === 'pago').length },
    { k: 'em_aberto', label: 'Em aberto', n: vendas.filter(v => v.status_pagamento === 'em_aberto').length },
    { k: 'vencido',   label: 'Vencidos',  n: vendas.filter(v => v.status_pagamento === 'vencido').length },
  ];
  const lista = filtro === 'todos' ? vendas : vendas.filter(v => v.status_pagamento === filtro);

  const KPIS = [
    { tone: 'tone-info',  ic: 'cart',  val: fmtNum(totalVendas), lbl: 'Pedidos', sub: 'no período' },
    { tone: 'tone-brand', ic: 'chart', val: fmtBRL(faturamento, 0), lbl: 'Receita', sub: 'faturamento bruto' },
    { tone: 'tone-ok',    ic: 'spark', val: fmtBRL(lucroEstimado, 0), lbl: 'Lucro', sub: `margem ${fmtPctR(faturamento?lucroEstimado/faturamento*100:0)}` },
    { tone: 'tone-warn',  ic: 'tag',   val: fmtBRL(ticket, 0), lbl: 'Ticket médio', sub: 'por pedido' },
  ];

  return (<>
    <div className="cf-rp-kpis">
      {KPIS.map(k => (
        <div key={k.lbl} className={`cf-kpi ${k.tone}`}>
          <div className="cf-kpi-top"><span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
          <div className="cf-kpi-val">{k.val}</div>
          <div><div className="cf-kpi-lbl">{k.lbl}</div><div className="cf-kpi-sub">{k.sub}</div></div>
        </div>
      ))}
    </div>

    <div className="cf-row cf-row-1-1">
      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Status dos pedidos</div><div className="cf-card-sub">entrega e pagamento</div></div></div>
        <div className="cf-rp-mini">
          {porEntrega.map(r => <MiniBar key={r.key} label={r.label} val={r.val} max={maxEnt} color={r.color} right={<span><strong>{r.val}</strong> {r.val===1?'pedido':'pedidos'}</span>}/>)}
        </div>
        <div className="cf-rp-subhead"><div className="cf-rp-subhead-t">Pagamento</div></div>
        <div className="cf-rp-mini">
          {porPag.map(r => <MiniBar key={r.key} label={r.label} val={r.val} max={maxPag} color={r.color} right={<span><strong>{r.val}</strong> {r.val===1?'pedido':'pedidos'}</span>}/>)}
        </div>
      </div>

      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Formas de pagamento</div><div className="cf-card-sub">por nº de pedidos e receita</div></div></div>
        {porModo.length === 0 ? <div className="cf-rp-empty">Sem dados</div> : (
          <div className="cf-rp-mini">
            {porModo.map((r, i) => <MiniBar key={r.label} label={r.label} val={r.val} max={maxModo} color={`var(--cat-${i%5})`} right={<span><strong>{r.val}×</strong> · {fmtBRL(r.receita, 0)}</span>}/>)}
          </div>
        )}
      </div>
    </div>

    <div className="cf-rp-table vendas">
      <div className="cf-rp-table-head">
        <div><div className="cf-card-title">Pedidos do período</div><div className="cf-card-sub">{lista.length} resultado(s)</div></div>
        <div className="cf-rp-chips">
          {FILTROS.map(f => <button key={f.k} className={`cf-rp-chip${filtro===f.k?' on':''}`} onClick={()=>setFiltro(f.k)}>{f.label} · {f.n}</button>)}
        </div>
      </div>
      <div className="cf-rp-thead">
        <div className="cf-rp-th">#</div><div className="cf-rp-th">Cliente</div><div className="cf-rp-th">Itens</div>
        <div className="cf-rp-th">Entrega</div><div className="cf-rp-th">Pagamento</div><div className="cf-rp-th">Forma</div>
        <div className="cf-rp-th r">Total</div>
      </div>
      {lista.length === 0 ? <div className="cf-rp-empty">Nenhum pedido neste filtro</div> : lista.map(v => {
        const balcao = /balc/i.test(v.cliente);
        return (
          <div key={v.id} className="cf-rp-row">
            <div className="cf-rp-id">#{v.id}</div>
            <div className="cf-rp-cli">
              <span className={`cf-rp-avatar${balcao?' balcao':''}`}>{balcao?'•':inicial(v.cliente)}</span>
              <div style={{minWidth:0}}>
                <div className="cf-rp-name">{v.cliente}</div>
                <div className="cf-rp-name-sub">{v.data}</div>
              </div>
            </div>
            <div className="cf-rp-num">{v.itens}</div>
            <div><Pill s={v.status_entrega} meta={ENT_META}/></div>
            <div><Pill s={v.status_pagamento} meta={PAG_META}/></div>
            <div className="cf-rp-num">{v.modo_pagamento || '—'}</div>
            <div className="cf-rp-num ok r">{fmtBRL(v.total, 2)}</div>
          </div>
        );
      })}
    </div>
  </>);
}

/* ══════════ ABA · ESTOQUE ══════════ */
function TabEstoque({ produtos }) {
  const ordenado = [...produtos].sort((a, b) => (b.valor_estoque||0) - (a.valor_estoque||0));
  const valorTotal = produtos.reduce((a,p)=>a+(p.valor_estoque||0),0);
  const valorVenda = produtos.reduce((a,p)=>a+((p.preco_venda||0)*(p.estoque_atual||0)),0);
  const esgotados = produtos.filter(p => p.status === 'esgotado').length;
  const criticos  = produtos.filter(p => p.status === 'critico').length;

  const KPIS = [
    { tone: 'tone-info',  ic: 'box',    val: produtos.length, lbl: 'Produtos', sub: 'ativos no sistema' },
    { tone: 'tone-brand', ic: 'layers', val: fmtBRL(valorTotal, 0), lbl: 'Valor em estoque', sub: `venda ${fmtBRL(valorVenda, 0)}` },
    { tone: 'tone-warn',  ic: 'bell',   val: criticos, lbl: 'Críticos', sub: 'abaixo do mínimo' },
    { tone: 'tone-crit',  ic: 'arrowOut', val: esgotados, lbl: 'Esgotados', sub: 'sem estoque' },
  ];

  return (<>
    <div className="cf-rp-kpis">
      {KPIS.map(k => (
        <div key={k.lbl} className={`cf-kpi ${k.tone}`}>
          <div className="cf-kpi-top"><span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
          <div className="cf-kpi-val">{k.val}</div>
          <div><div className="cf-kpi-lbl">{k.lbl}</div><div className="cf-kpi-sub">{k.sub}</div></div>
        </div>
      ))}
    </div>

    <div className="cf-rp-table estoque">
      <div className="cf-rp-table-head">
        <div><div className="cf-card-title">Snapshot do estoque</div><div className="cf-card-sub">ordenado por valor a preço de custo</div></div>
      </div>
      <div className="cf-rp-thead">
        <div className="cf-rp-th">Produto</div><div className="cf-rp-th">Categoria</div><div className="cf-rp-th r">Custo</div>
        <div className="cf-rp-th">Estoque</div><div className="cf-rp-th r">Valor estoque</div><div className="cf-rp-th">Status</div>
      </div>
      {ordenado.length === 0 ? <div className="cf-rp-empty">Nenhum produto cadastrado</div> : ordenado.map(p => (
        <div key={p.id} className="cf-rp-row">
          <div style={{minWidth:0}}>
            <div className="cf-rp-name">{p.nome}</div>
            <div className="cf-rp-name-sub">{p.sku || '—'}</div>
          </div>
          <div className="cf-rp-num">{p.categoria || 'Sem categoria'}</div>
          <div className="cf-rp-num r">{fmtBRL(p.preco_custo)}</div>
          <div className="cf-rp-stock">
            <span className="cf-rp-stock-n">{p.estoque_atual} {p.unidade || 'un'}</span>
            <StockMeter atual={p.estoque_atual||0} minimo={p.estoque_minimo||5}/>
          </div>
          <div className="cf-rp-num ok r">{fmtBRL(p.valor_estoque, 0)}</div>
          <div><Pill s={p.status === 'critico' ? 'em_aberto' : p.status === 'esgotado' ? 'vencido' : 'pago'} meta={{
            pago:{cls:'ok',label:'OK'}, em_aberto:{cls:'warn',label:'Baixo'}, vencido:{cls:'crit',label:'Esgotado'}
          }}/></div>
        </div>
      ))}
    </div>
  </>);
}

/* ══════════ ABA · PRODUTOS ══════════ */
function TabProdutos({ topProdutos, dias, setDias }) {
  const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['365', '1 ano']];
  const porQtd = [...topProdutos].sort((a, b) => (b.qtd_vendida||0) - (a.qtd_vendida||0));
  const porRec = [...topProdutos].sort((a, b) => (b.receita||0) - (a.receita||0));
  const maxQtd = Math.max(...topProdutos.map(p => p.qtd_vendida||0), 1);
  const maxRec = Math.max(...topProdutos.map(p => p.receita||0), 1);
  const totalUn = topProdutos.reduce((a, p) => a + (p.qtd_vendida||0), 0);
  const totalRec = topProdutos.reduce((a, p) => a + (p.receita||0), 0);

  // agrupa por categoria a partir do topProdutos (não temos endpoint dedicado, calculamos aqui)
  const catMap = {};
  topProdutos.forEach(p => {
    const c = p.categoria || 'Sem categoria';
    if (!catMap[c]) catMap[c] = { nome: c, valor: 0 };
    catMap[c].valor += (p.receita || 0);
  });
  const categorias = Object.values(catMap).sort((a,b) => b.valor - a.valor);
  const totalCat = categorias.reduce((a,x) => a + x.valor, 0);

  const KPIS = [
    { tone: 'tone-brand', ic: 'box',   val: topProdutos.length, lbl: 'Produtos vendidos', sub: 'com saída no período' },
    { tone: 'tone-info',  ic: 'layers',val: fmtNum(totalUn), lbl: 'Unidades saídas', sub: 'total de itens' },
    { tone: 'tone-ok',    ic: 'chart', val: fmtBRL(totalRec, 0), lbl: 'Receita gerada', sub: 'pelo top produtos' },
    { tone: 'tone-warn',  ic: 'spark', val: (porQtd[0]?.qtd_vendida || 0), lbl: 'Mais vendido', sub: porQtd[0]?.nome || '—' },
  ];

  return (<>
    <div className="cf-rp-head" style={{marginBottom:2}}>
      <div className="cf-rp-chips">
        {PERIODOS.map(([v, l]) => <button key={v} className={`cf-rp-chip${dias===v?' on':''}`} onClick={()=>setDias(v)}>{l}</button>)}
      </div>
    </div>

    <div className="cf-rp-kpis">
      {KPIS.map(k => (
        <div key={k.lbl} className={`cf-kpi ${k.tone}`}>
          <div className="cf-kpi-top"><span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span></div>
          <div className="cf-kpi-val">{k.val}</div>
          <div><div className="cf-kpi-lbl">{k.lbl}</div><div className="cf-kpi-sub">{k.sub}</div></div>
        </div>
      ))}
    </div>

    <div className="cf-row cf-row-1-1">
      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Mais vendidos · quantidade</div><div className="cf-card-sub">unidades saídas</div></div></div>
        {porQtd.length === 0 ? <div className="cf-rp-empty">Sem vendas no período</div> : porQtd.slice(0, 10).map((p, i) => (
          <div key={p.id} className="cf-top-row">
            <span className="cf-rank">{i + 1}</span>
            <div className="cf-top-main">
              <div className="cf-top-name">{p.nome}</div>
              <div className="cf-top-bar"><div className="cf-top-fill" style={{ width: `${(p.qtd_vendida / maxQtd) * 100}%` }} /></div>
            </div>
            <div className="cf-top-val">{p.qtd_vendida} un.</div>
          </div>
        ))}
      </div>

      <div className="cf-card">
        <div className="cf-card-head"><div><div className="cf-card-title">Mais vendidos · receita</div><div className="cf-card-sub">valor gerado</div></div></div>
        {porRec.length === 0 ? <div className="cf-rp-empty">Sem vendas no período</div> : porRec.slice(0, 10).map((p, i) => (
          <div key={p.id} className="cf-top-row">
            <span className="cf-rank">{i + 1}</span>
            <div className="cf-top-main">
              <div className="cf-top-name">{p.nome}</div>
              <div className="cf-top-bar"><div className="cf-top-fill" style={{ width: `${(p.receita / maxRec) * 100}%` }} /></div>
            </div>
            <div className="cf-top-val">{fmtBRL(p.receita, 0)}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="cf-card">
      <div className="cf-card-head"><div><div className="cf-card-title">Distribuição por categoria</div><div className="cf-card-sub">participação nas vendas</div></div></div>
      {categorias.length === 0 ? <div className="cf-rp-empty">Sem dados de categoria</div> : (
        <div className="cf-donut-wrap">
          <Donut items={categorias} size={148}/>
          <div className="cf-cat-legend">
            {categorias.map((c, i) => (
              <div key={c.nome} className="cf-cat-row">
                <span className="cf-cat-dot" style={{ background: `var(--cat-${i%5})` }}/>
                <span className="cf-cat-name">{c.nome}</span>
                <span className="cf-cat-pct">{fmtPctR((c.valor / totalCat) * 100)}</span>
                <span className="cf-cat-val">{fmtBRL(c.valor, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </>);
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
const TABS = [
  { key: 'geral',    label: 'Resumo geral', ic: 'grid' },
  { key: 'vendas',   label: 'Vendas',       ic: 'cart' },
  { key: 'estoque',  label: 'Estoque',      ic: 'layers' },
  { key: 'produtos', label: 'Produtos',     ic: 'box' },
];

export default function Relatorios() {
  const [theme, setTheme] = useState(getDocTheme);
  const [aba, setAba] = useState('geral');

  const [resumo, setResumo] = useState(null);
  const [mensal, setMensal] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [produtosEst, setProdutosEst] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [dias, setDias] = useState('30');

  const [loadingGeral, setLoadingGeral] = useState(false);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  const loadGeral = useCallback(async () => {
    setLoadingGeral(true); setErro('');
    try {
      const [r, m] = await Promise.all([
        api.get('/relatorios/resumo-geral'),
        api.get('/dashboard/vendas-por-mes'),
      ]);
      setResumo(r);
      setMensal(Array.isArray(m) ? m : []);
    } catch (e) { setErro(e.message || 'Erro ao carregar resumo geral'); }
    finally { setLoadingGeral(false); }
  }, []);

  const loadVendas = useCallback(async () => {
    setLoadingVendas(true); setErro('');
    try { const v = await api.get('/relatorios/vendas-periodo'); setVendas(Array.isArray(v) ? v : []); }
    catch (e) { setErro(e.message || 'Erro ao carregar vendas'); }
    finally { setLoadingVendas(false); }
  }, []);

  const loadEstoque = useCallback(async () => {
    setLoadingEstoque(true); setErro('');
    try { const p = await api.get('/relatorios/estoque-snapshot'); setProdutosEst(Array.isArray(p) ? p : []); }
    catch (e) { setErro(e.message || 'Erro ao carregar estoque'); }
    finally { setLoadingEstoque(false); }
  }, []);

  const loadProdutos = useCallback(async (d = dias) => {
    setLoadingProdutos(true); setErro('');
    try { const p = await api.get(`/relatorios/produtos-mais-vendidos?dias=${d}`); setTopProdutos(Array.isArray(p) ? p : []); }
    catch (e) { setErro(e.message || 'Erro ao carregar produtos'); }
    finally { setLoadingProdutos(false); }
  }, [dias]);

  // carrega dados sob demanda por aba
  useEffect(() => {
    if (aba === 'geral' && !resumo) loadGeral();
    if (aba === 'vendas' && vendas.length === 0) loadVendas();
    if (aba === 'estoque' && produtosEst.length === 0) loadEstoque();
    if (aba === 'produtos') loadProdutos(dias);
  // eslint-disable-next-line
  }, [aba, dias]);

  const loading = (aba==='geral'&&loadingGeral)||(aba==='vendas'&&loadingVendas)||(aba==='estoque'&&loadingEstoque)||(aba==='produtos'&&loadingProdutos);

  return (
    <div className="cf-rel-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-rel">

        <div className="cf-rp-head">
          <div>
            <div className="cf-rp-head-t">Relatórios & análises</div>
            <div className="cf-rp-head-sub">visão consolidada do negócio · {TABS.find(t => t.key === aba)?.label.toLowerCase()}</div>
          </div>
          <div className="cf-rp-tabs">
            {TABS.map(t => (
              <button key={t.key} className={aba === t.key ? 'on' : ''} onClick={() => setAba(t.key)}>
                <span style={{display:'flex'}}><Ic d={ICONS[t.ic]} size={14}/></span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {erro && <div className="cf-rel-err">⚠ {erro}</div>}

        {loading ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:110}}/>)}</div>
            <div className="cf-skel" style={{height:280}}/>
          </>
        ) : (
          <div className="cf-rp-body" key={aba}>
            {aba === 'geral'    && <TabGeral resumo={resumo} mensal={mensal}/>}
            {aba === 'vendas'   && <TabVendas vendas={vendas} resumo={resumo}/>}
            {aba === 'estoque'  && <TabEstoque produtos={produtosEst}/>}
            {aba === 'produtos' && <TabProdutos topProdutos={topProdutos} dias={dias} setDias={setDias}/>}
          </div>
        )}
      </div>
    </div>
  );
}