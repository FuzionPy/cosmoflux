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
const fmtPct = (v) => Number(v || 0).toFixed(1).replace('.', ',') + '%';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PERIODOS = [
  { key: 'hoje',  label: 'Hoje' },
  { key: 'mes',   label: 'Este mês' },
  { key: 'ano',   label: 'Este ano' },
  { key: 'total', label: 'Total' },
];

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>
    {d}
  </svg>
);
const ICONS = {
  chart:    <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  arrowOut: <><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>,
  spark:    <path d="M12 2.5 14.2 9 21 11l-6.8 2L12 19.5 9.8 13 3 11l6.8-2L12 2.5Z"/>,
  layers:   <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
};

/* ── sparkline (substitui o Spark do preview) ─────────────────────────── */
function Spark({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 64, ht = 26, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${ht - ((v - min) / range) * (ht - 3) - 1.5}`).join(' ');
  return (
    <svg width={w} height={ht} viewBox={`0 0 ${w} ${ht}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}

/* ── medidor semicircular de margem ───────────────────────────────────── */
function MargemGauge({ pct }) {
  const r = 74, cx = 86, cy = 84, sw = 15;
  const circ = Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const cor = pct >= 40 ? 'var(--ok)' : pct >= 25 ? 'var(--brand)' : pct >= 12 ? 'var(--warn)' : 'var(--crit)';
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="cf-lc-gauge">
      <svg width="172" height="96" viewBox="0 0 172 96">
        <path d={d} fill="none" stroke="var(--track)" strokeWidth={sw} strokeLinecap="round" />
        <path d={d} fill="none" stroke={cor} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="cf-lc-gauge-val" style={{ color: cor }}>{fmtPct(pct)}</div>
    </div>
  );
}

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-luc-root *,.cf-luc-root *::before,.cf-luc-root *::after{box-sizing:border-box;}
.cf-luc-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--card-pad:18px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cflIn .3s ease both;}
@keyframes cflIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-luc-root[data-theme="dark"],.cf-luc-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-luc-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-luc-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}

.cf-lucros{display:flex;flex-direction:column;gap:var(--gap);max-width:1480px;margin:0 auto;}

.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}
.cf-card.glow{background:linear-gradient(150deg,color-mix(in oklab,var(--brand) 7%,var(--surface)),var(--surface));}
.cf-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:var(--card-pad) var(--card-pad) 10px;}
.cf-card-title{font-size:14px;font-weight:800;}
.cf-card-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:3px;}
.cf-lc-err{font-size:12px;color:var(--crit);background:color-mix(in oklab,var(--crit) 10%,transparent);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:9px 13px;}
.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cflSh 1.5s infinite;border-radius:8px;}
@keyframes cflSh{from{background-position:200% 0}to{background-position:-200% 0}}

.cf-lc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.cf-lc-head-t{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.cf-lc-head-sub{font-size:12px;font-family:var(--font-mono);color:var(--text-muted);margin-top:4px;}
.cf-lc-seg{display:inline-flex;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:3px;gap:2px;box-shadow:var(--shadow);}
.cf-lc-seg button{padding:8px 16px;border-radius:8px;border:none;background:none;cursor:pointer;font-family:var(--font-ui);font-size:12.5px;font-weight:600;color:var(--text-muted);transition:all .15s;}
.cf-lc-seg button:hover:not(.on){color:var(--text);}
.cf-lc-seg button.on{background:var(--brand-soft);color:var(--brand);}
.cf-luc-root[data-theme="light"] .cf-lc-seg button.on{color:color-mix(in oklab,var(--brand) 78%,#000);}

.cf-lc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--card-pad);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:10px;}
.cf-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--brand));}
.cf-kpi.tone-info{--tone:#3b82f6;}
.cf-kpi.tone-warn{--tone:var(--warn);}
.cf-kpi.tone-brand{--tone:var(--brand);}
.cf-kpi.tone-ok{--tone:var(--ok);}
.cf-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.cf-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--tone,var(--brand)) 14%,transparent);color:var(--tone,var(--brand));}
.cf-kpi-val{font-size:22px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1;}
.cf-kpi-lbl{font-size:11.5px;font-weight:600;color:var(--text-dim);}
.cf-kpi-sub{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-lc-kpi-flag{font-family:var(--font-mono);font-size:10.5px;font-weight:600;margin-top:2px;}
.cf-lc-kpi-flag.ok{color:var(--ok);}
.cf-lc-kpi-flag.warn{color:var(--warn);}
.cf-lc-kpi-flag.crit{color:var(--crit);}

.cf-lc-mid{display:grid;grid-template-columns:1.75fr 1fr;gap:var(--gap);}
.cf-lc-chart{padding:6px var(--card-pad) var(--card-pad);display:flex;flex-direction:column;gap:16px;}
.cf-lc-bars{display:flex;align-items:flex-end;gap:6px;height:168px;}
.cf-lc-col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;cursor:pointer;}
.cf-lc-slot{position:relative;width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center;}
.cf-lc-stack{position:relative;width:100%;max-width:34px;display:flex;flex-direction:column;justify-content:flex-end;height:100%;}
.cf-lc-seg-receita{width:100%;border-radius:5px 5px 0 0;background:color-mix(in oklab,var(--text) 11%,transparent);transition:height .7s cubic-bezier(.22,1,.36,1),background .2s;}
.cf-lc-seg-lucro{width:100%;border-radius:5px 5px 2px 2px;background:color-mix(in oklab,var(--brand) 45%,transparent);transition:height .7s cubic-bezier(.22,1,.36,1),background .2s;}
.cf-lc-col.on .cf-lc-seg-receita{background:color-mix(in oklab,var(--text) 20%,transparent);}
.cf-lc-col.on .cf-lc-seg-lucro{background:var(--brand);}
.cf-lc-col.now .cf-lc-seg-lucro{background:var(--brand);}
.cf-lc-col.now .cf-lc-seg-receita{background:color-mix(in oklab,var(--brand) 22%,transparent);}
.cf-lc-lbl{font-size:9.5px;font-family:var(--font-mono);color:var(--text-muted);}
.cf-lc-lbl.now{color:var(--brand);font-weight:700;}
.cf-lc-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);z-index:6;background:var(--elevated);border:1px solid var(--border-strong);border-radius:9px;padding:8px 11px;display:flex;flex-direction:column;gap:3px;white-space:nowrap;box-shadow:var(--shadow);}
.cf-lc-tip-row{display:flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;}
.cf-lc-tip-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}
.cf-lc-tip-row strong{margin-left:auto;}
.cf-lc-legend{display:flex;gap:18px;flex-wrap:wrap;}
.cf-lc-leg{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--text-dim);}
.cf-lc-leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}

.cf-lc-gauge-wrap{padding:10px var(--card-pad) var(--card-pad);display:flex;flex-direction:column;align-items:center;gap:4px;}
.cf-lc-gauge{position:relative;width:172px;height:96px;}
.cf-lc-gauge-val{position:absolute;left:0;right:0;bottom:4px;text-align:center;font-size:30px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;}
.cf-lc-gauge-cap{font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;}
.cf-lc-break{width:100%;margin-top:16px;display:flex;flex-direction:column;gap:2px;}
.cf-lc-brow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;}
.cf-lc-brow + .cf-lc-brow{border-top:1px solid var(--border);}
.cf-lc-bl{font-size:12.5px;color:var(--text-dim);}
.cf-lc-bv{font-family:var(--font-mono);font-size:13px;font-weight:700;}
.cf-lc-bv.sub{color:var(--warn);}
.cf-lc-bv.desc{color:var(--text-muted);}
.cf-lc-brow.total{margin-top:4px;padding-top:13px;border-top:1px solid var(--border-strong);}
.cf-lc-brow.total .cf-lc-bl{font-weight:700;color:var(--text);font-size:13px;}
.cf-lc-brow.total .cf-lc-bv{font-size:18px;color:var(--ok);}
.cf-lc-brow.total .cf-lc-bv.neg{color:var(--crit);}

.cf-lc-tools{display:flex;align-items:center;gap:8px;}
.cf-lc-select{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:7px 12px;font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--text-dim);cursor:pointer;outline:none;transition:border-color .15s;}
.cf-lc-select:hover{border-color:var(--border-strong);}
.cf-lc-thead,.cf-lc-row{display:grid;grid-template-columns:44px minmax(200px,1.9fr) 0.7fr 1fr 1fr 1fr 88px 1fr;align-items:center;gap:12px;padding:0 18px;}
.cf-lc-thead{height:42px;border-bottom:1px solid var(--border);}
.cf-lc-th{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-lc-th.r{text-align:right;justify-self:end;}
.cf-lc-row{min-height:58px;border-bottom:1px solid var(--border);transition:background .12s;}
.cf-lc-row:last-child{border-bottom:none;}
.cf-lc-row:hover{background:color-mix(in oklab,var(--text) 3%,transparent);}
.cf-lc-rank{font-family:var(--font-mono);font-size:12px;color:var(--text-muted);}
.cf-lc-rank.top{color:var(--brand);font-weight:700;}
.cf-lc-prod-nome{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cf-lc-prod-cat{font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-top:2px;}
.cf-lc-num{font-family:var(--font-mono);font-size:12.5px;color:var(--text-dim);}
.cf-lc-num.r{text-align:right;justify-self:end;}
.cf-lc-num.custo{color:var(--warn);}
.cf-lc-num.lucro{color:var(--ok);font-weight:700;}
.cf-lc-num.lucro.neg{color:var(--crit);}
.cf-lc-mgm{display:inline-flex;padding:2px 9px;border-radius:7px;font-family:var(--font-mono);font-size:10.5px;font-weight:700;justify-self:start;}
.cf-lc-mgm.high{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok);}
.cf-lc-mgm.mid{background:color-mix(in oklab,var(--warn) 16%,transparent);color:var(--warn);}
.cf-lc-mgm.low{background:color-mix(in oklab,var(--crit) 15%,transparent);color:var(--crit);}
.cf-lc-part{display:flex;align-items:center;gap:9px;}
.cf-lc-part-track{flex:1;height:5px;background:var(--track);border-radius:3px;overflow:hidden;}
.cf-lc-part-fill{height:100%;background:var(--brand);border-radius:3px;transition:width .8s cubic-bezier(.22,1,.36,1);}
.cf-lc-part-pct{font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);min-width:30px;text-align:right;}
.cf-lc-empty{padding:56px 20px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;}

@media(max-width:1100px){
  .cf-lc-kpis{grid-template-columns:repeat(2,1fr);}
  .cf-lc-mid{grid-template-columns:1fr;}
  .cf-lc-thead{display:none;}
  .cf-lc-row{grid-template-columns:1fr auto;grid-auto-rows:auto;gap:4px 12px;padding:14px 16px;}
  .cf-lc-rank{display:none;}
  .cf-lc-prod{grid-column:1;grid-row:1;}
  .cf-lc-num.qtd,.cf-lc-num.receita,.cf-lc-part{display:none;}
  .cf-lc-num.custo{grid-column:1;grid-row:2;justify-self:start;}
  .cf-lc-num.lucro{grid-column:2;grid-row:1;}
  .cf-lc-mgm{grid-column:2;grid-row:2;justify-self:end;}
}
@media(max-width:560px){.cf-lc-kpis{grid-template-columns:1fr;}}
`;

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
export default function Lucros() {
  const [theme, setTheme] = useState(getDocTheme);
  const [resumo, setResumo] = useState(null);
  const [mensal, setMensal] = useState([]);
  const [porProduto, setPorProduto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [periodo, setPeriodo] = useState('mes');
  const [ordem, setOrdem] = useState('lucro');
  const [hov, setHov] = useState(null);

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  const load = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const [r, m, p] = await Promise.all([
        api.get('/lucros/resumo'), api.get('/lucros/mensal'), api.get('/lucros/por-produto'),
      ]);
      setResumo(r || {});
      setMensal(Array.isArray(m) ? m : []);
      setPorProduto(Array.isArray(p) ? p : []);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar os dados de lucros.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const d = (resumo && resumo[periodo]) || {};
  const mesAtual = new Date().getMonth();

  const maxReceita = useMemo(() => Math.max(...mensal.map(m => m.receita), 1), [mensal]);
  const prodOrdenados = useMemo(() => [...porProduto].sort((a, b) => b[ordem] - a[ordem]), [porProduto, ordem]);
  const maxLucro = useMemo(() => Math.max(...porProduto.map(p => p.lucro), 1), [porProduto]);

  const margemCls = (m) => m >= 40 ? 'high' : m >= 20 ? 'mid' : 'low';
  const flagMargem = d.margem >= 40
    ? { cls: 'ok', txt: 'margem saudável' }
    : d.margem >= 25 ? { cls: 'ok', txt: 'margem estável' }
    : d.margem >= 12 ? { cls: 'warn', txt: 'margem moderada' }
    : { cls: 'crit', txt: 'margem baixa' };

  const sparkLucro = mensal.map(m => m.lucro);
  const sparkMargem = mensal.map(m => m.receita ? (m.lucro / m.receita) * 100 : 0);

  const KPIS = [
    { tone: 'tone-info', ic: 'chart', val: fmtBRL(d.receita, 0), lbl: 'Receita', sub: `${(d.pedidos || 0).toLocaleString('pt-BR')} pedido(s)`, spark: mensal.map(m => m.receita) },
    { tone: 'tone-warn', ic: 'arrowOut', val: fmtBRL(d.custo, 0), lbl: 'Custo dos produtos', sub: `descontos ${fmtBRL(d.descontos, 0)}` },
    { tone: 'tone-brand', ic: 'spark', val: fmtBRL(d.lucro, 0), lbl: 'Lucro líquido', sub: d.lucro >= 0 ? 'resultado positivo' : 'resultado negativo', spark: sparkLucro },
    { tone: 'tone-ok', ic: 'layers', val: fmtPct(d.margem), lbl: 'Margem líquida', flag: flagMargem, spark: sparkMargem },
  ];

  return (
    <div className="cf-luc-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-lucros">

        <div className="cf-lc-head">
          <div>
            <div className="cf-lc-head-t">Análise de lucros</div>
            <div className="cf-lc-head-sub">rentabilidade e margem · {PERIODOS.find(p => p.key === periodo)?.label.toLowerCase()}</div>
          </div>
          <div className="cf-lc-seg">
            {PERIODOS.map(p => (
              <button key={p.key} className={periodo === p.key ? 'on' : ''} onClick={() => setPeriodo(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>

        {erro && <div className="cf-lc-err">⚠ {erro}</div>}

        {loading ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>{[1,2,3,4].map(i=><div key={i} className="cf-skel" style={{height:110}}/>)}</div>
            <div className="cf-skel" style={{height:260}}/>
          </>
        ) : (
          <>
            <div className="cf-lc-kpis">
              {KPIS.map(k => (
                <div key={k.lbl} className={`cf-kpi ${k.tone}`}>
                  <div className="cf-kpi-top">
                    <span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} size={16}/></span>
                    {k.spark && k.spark.some(v=>v>0) && <Spark data={k.spark} color="var(--tone, var(--brand))" />}
                  </div>
                  <div className="cf-kpi-val">{k.val}</div>
                  <div>
                    <div className="cf-kpi-lbl">{k.lbl}</div>
                    {k.flag
                      ? <div className={`cf-lc-kpi-flag ${k.flag.cls}`}>{k.flag.txt}</div>
                      : <div className="cf-kpi-sub">{k.sub}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="cf-lc-mid">
              <div className="cf-card">
                <div className="cf-card-head">
                  <div>
                    <div className="cf-card-title">Receita × Lucro por mês</div>
                    <div className="cf-card-sub">{new Date().getFullYear()} · 12 meses</div>
                  </div>
                </div>
                <div className="cf-lc-chart">
                  <div className="cf-lc-bars">
                    {mensal.map((m, i) => {
                      const hR = Math.max((m.receita / maxReceita) * 100, m.receita > 0 ? 2 : 0);
                      const hL = Math.max((m.lucro / maxReceita) * 100, m.lucro > 0 ? 2 : 0);
                      const now = i === mesAtual;
                      const on = hov === i;
                      return (
                        <div key={i} className={`cf-lc-col${now ? ' now' : ''}${on ? ' on' : ''}`}
                          onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
                          <div className="cf-lc-slot">
                            {on && (
                              <div className="cf-lc-tip">
                                <div className="cf-lc-tip-row">
                                  <span className="cf-lc-tip-dot" style={{ background: 'color-mix(in oklab, var(--text) 22%, transparent)' }} />
                                  Receita <strong>{fmtBRL(m.receita, 0)}</strong>
                                </div>
                                <div className="cf-lc-tip-row">
                                  <span className="cf-lc-tip-dot" style={{ background: 'var(--brand)' }} />
                                  Lucro <strong>{fmtBRL(m.lucro, 0)}</strong>
                                </div>
                              </div>
                            )}
                            <div className="cf-lc-stack">
                              <div className="cf-lc-seg-receita" style={{ height: `${hR}%`, transitionDelay: `${i * 0.03}s` }} />
                              <div className="cf-lc-seg-lucro" style={{ height: `${hL}%`, transitionDelay: `${i * 0.03 + 0.05}s` }} />
                            </div>
                          </div>
                          <div className={`cf-lc-lbl${now ? ' now' : ''}`}>{MESES[i]}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cf-lc-legend">
                    <div className="cf-lc-leg"><span className="cf-lc-leg-dot" style={{ background: 'color-mix(in oklab, var(--text) 22%, transparent)' }} />Receita</div>
                    <div className="cf-lc-leg"><span className="cf-lc-leg-dot" style={{ background: 'var(--brand)' }} />Lucro</div>
                  </div>
                </div>
              </div>

              <div className="cf-card glow">
                <div className="cf-card-head">
                  <div>
                    <div className="cf-card-title">Margem de lucro</div>
                    <div className="cf-card-sub">{PERIODOS.find(p => p.key === periodo)?.label}</div>
                  </div>
                </div>
                <div className="cf-lc-gauge-wrap">
                  <MargemGauge pct={d.margem || 0} />
                  <div className="cf-lc-gauge-cap">margem líquida</div>
                  <div className="cf-lc-break">
                    <div className="cf-lc-brow">
                      <span className="cf-lc-bl">Receita total</span>
                      <span className="cf-lc-bv">{fmtBRL(d.receita)}</span>
                    </div>
                    <div className="cf-lc-brow">
                      <span className="cf-lc-bl">(−) Custo dos produtos</span>
                      <span className="cf-lc-bv sub">−{fmtBRL(d.custo)}</span>
                    </div>
                    {d.descontos > 0 && (
                      <div className="cf-lc-brow">
                        <span className="cf-lc-bl">(−) Descontos</span>
                        <span className="cf-lc-bv desc">−{fmtBRL(d.descontos)}</span>
                      </div>
                    )}
                    <div className="cf-lc-brow total">
                      <span className="cf-lc-bl">Lucro líquido</span>
                      <span className={`cf-lc-bv${d.lucro >= 0 ? '' : ' neg'}`}>{fmtBRL(d.lucro)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cf-card">
              <div className="cf-card-head" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="cf-card-title">Rentabilidade por produto</div>
                  <div className="cf-card-sub">{porProduto.length} produto(s) com vendas</div>
                </div>
                <div className="cf-lc-tools">
                  <select className="cf-lc-select" value={ordem} onChange={e => setOrdem(e.target.value)}>
                    <option value="lucro">Ordenar por lucro</option>
                    <option value="receita">Ordenar por receita</option>
                    <option value="margem">Ordenar por margem</option>
                    <option value="qtd_vendida">Ordenar por quantidade</option>
                  </select>
                </div>
              </div>

              <div className="cf-lc-table">
                <div className="cf-lc-thead">
                  <div className="cf-lc-th">#</div>
                  <div className="cf-lc-th">Produto</div>
                  <div className="cf-lc-th r">Qtd</div>
                  <div className="cf-lc-th r">Receita</div>
                  <div className="cf-lc-th r">Custo</div>
                  <div className="cf-lc-th r">Lucro</div>
                  <div className="cf-lc-th">Margem</div>
                  <div className="cf-lc-th">Participação</div>
                </div>

                {prodOrdenados.length === 0 ? (
                  <div className="cf-lc-empty">Nenhum produto com vendas registradas</div>
                ) : prodOrdenados.map((p, i) => (
                  <div key={p.id} className="cf-lc-row">
                    <div className={`cf-lc-rank${i < 3 ? ' top' : ''}`}>{i + 1}</div>
                    <div className="cf-lc-prod">
                      <div className="cf-lc-prod-nome">{p.nome}</div>
                      <div className="cf-lc-prod-cat">{p.categoria || 'Sem categoria'}</div>
                    </div>
                    <div className="cf-lc-num qtd r">{p.qtd_vendida}</div>
                    <div className="cf-lc-num receita r">{fmtBRL(p.receita, 0)}</div>
                    <div className="cf-lc-num custo r">{fmtBRL(p.custo, 0)}</div>
                    <div className={`cf-lc-num lucro r${p.lucro < 0 ? ' neg' : ''}`}>{fmtBRL(p.lucro, 0)}</div>
                    <div>
                      <span className={`cf-lc-mgm ${margemCls(p.margem)}`}>{fmtPct(p.margem)}</span>
                    </div>
                    <div className="cf-lc-part">
                      <div className="cf-lc-part-track">
                        <div className="cf-lc-part-fill" style={{ width: `${Math.max((p.lucro / maxLucro) * 100, 0)}%` }} />
                      </div>
                      <span className="cf-lc-part-pct">{maxLucro > 0 ? `${Math.round((p.lucro / maxLucro) * 100)}%` : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}