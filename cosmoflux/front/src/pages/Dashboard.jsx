import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getKPIs, getVendasPorMes, getProdutos,
  getAlertasEstoque, getMovimentacoes, getPedidos
} from '../services/api';

/* helpers */
const fmtBRL = (v, dec = 2) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtCompact = (v) => v >= 1000 ? 'R$\u00a0' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil' : fmtBRL(v, 0);
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const THEME_KEY = 'cf-theme';
const getDocTheme = () => {
  const attr = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
  if (attr) return attr;
  try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-dash-root *,.cf-dash-root *::before,.cf-dash-root *::after{box-sizing:border-box;}
.cf-dash-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--gap:16px;--card-pad:20px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);}
.cf-dash-root[data-theme="dark"]{--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--ramp-end:#20242d;--shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 28px rgba(0,0,0,.32);color-scheme:dark;}
.cf-dash-root[data-theme="light"]{--bg:#f3f1f5;--surface:#ffffff;--surface-2:#f8f6fa;--elevated:#ffffff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--ramp-end:#ddd6e4;--shadow:0 1px 2px rgba(28,20,36,.04),0 10px 30px rgba(28,20,36,.07);color-scheme:light;}
.cf-dash-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);--cat-0:var(--brand);--cat-1:color-mix(in oklab,var(--brand) 80%,var(--ramp-end));--cat-2:color-mix(in oklab,var(--brand) 60%,var(--ramp-end));--cat-3:color-mix(in oklab,var(--brand) 42%,var(--ramp-end));--cat-4:color-mix(in oklab,var(--brand) 26%,var(--ramp-end));}
.cf-dash-root{background:var(--bg);color:var(--text);padding:24px;display:flex;flex-direction:column;gap:18px;min-height:100%;animation:cfIn .35s ease both;}
@keyframes cfIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-dh{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.cf-dh-title{font-size:20px;font-weight:800;color:var(--text);}
.cf-dh-sub{font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px;}
.cf-theme-btn{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 13px;cursor:pointer;color:var(--text-dim);font-family:var(--font-ui);font-size:12px;font-weight:600;transition:all .2s;}
.cf-theme-btn:hover{border-color:var(--border-strong);color:var(--text);}
.cf-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);}
.cf-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:var(--card-pad);position:relative;overflow:hidden;box-shadow:var(--shadow);transition:all .2s;animation:cfIn .4s ease both;}
.cf-kpi:hover{border-color:var(--border-strong);transform:translateY(-2px);}
.cf-kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.cf-kpi-ic{width:34px;height:34px;border-radius:9px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;}
.cf-kpi-val{font-size:24px;font-weight:800;color:var(--text);line-height:1;letter-spacing:-.01em;}
.cf-kpi-val.sm{font-size:18px;}
.cf-kpi-foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;}
.cf-kpi-lbl{font-size:12px;color:var(--text-dim);font-weight:500;}
.cf-kpi-sub{font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:6px;}
.cf-delta{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;font-family:var(--font-mono);padding:2px 7px;border-radius:20px;}
.cf-delta.up{color:var(--ok);background:color-mix(in oklab,var(--ok) 14%,transparent);}
.cf-delta.down{color:var(--crit);background:color-mix(in oklab,var(--crit) 14%,transparent);}
.cf-row{display:grid;gap:var(--gap);}
.cf-row-2-1{grid-template-columns:1.8fr 1fr;}
.cf-row-3{grid-template-columns:repeat(3,1fr);}
.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;animation:cfIn .4s ease both;}
.cf-card-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.cf-card-title{font-size:14px;font-weight:700;color:var(--text);}
.cf-card-sub{font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:3px;}
.cf-link-btn{background:none;border:none;color:var(--brand);font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;}
.cf-link-btn:hover{opacity:.75;}
.cf-card-pad{padding:18px;}
.cf-bars{position:relative;display:flex;align-items:flex-end;gap:5px;padding:18px 18px 0;}
.cf-bars-grid{position:absolute;left:18px;right:18px;height:1px;background:var(--border);}
.cf-bar-col{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;cursor:pointer;}
.cf-bar-slot{position:relative;width:100%;flex:1;display:flex;align-items:flex-end;}
.cf-bar{width:100%;border-radius:5px 5px 2px 2px;background:color-mix(in oklab,var(--text) 11%,transparent);transition:height .7s cubic-bezier(.22,1,.36,1),background .2s;}
.cf-bar.accent{background:var(--brand);}
.cf-bar.hot{background:color-mix(in oklab,var(--brand) 55%,transparent);}
.cf-bar-col:hover .cf-bar:not(.accent){background:color-mix(in oklab,var(--brand) 50%,transparent);}
.cf-bar-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:8px;padding:6px 10px;display:flex;flex-direction:column;gap:1px;white-space:nowrap;z-index:5;box-shadow:var(--shadow);}
.cf-bar-tip strong{font-size:13px;font-family:var(--font-mono);color:var(--text);}
.cf-bar-tip span{font-size:10px;color:var(--text-muted);font-family:var(--font-mono);}
.cf-bar-lbl{font-size:9px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.04em;}
.cf-bar-lbl.on{color:var(--brand);font-weight:700;}
.cf-card-foot-stats{display:flex;gap:24px;padding:14px 18px;border-top:1px solid var(--border);flex-wrap:wrap;}
.cf-fs-l{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);font-family:var(--font-mono);display:block;margin-bottom:4px;}
.cf-fs-v{font-size:15px;font-weight:800;color:var(--text);font-family:var(--font-mono);}
.cf-list{display:flex;flex-direction:column;}
.cf-row-item{display:flex;align-items:center;gap:11px;padding:11px 18px;border-bottom:1px solid var(--border);transition:background .15s;}
.cf-row-item:last-child{border-bottom:none;}
.cf-row-item:hover{background:var(--surface-2);}
.cf-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.cf-status-dot.crit{background:var(--crit);}
.cf-status-dot.warn{background:var(--warn);}
.cf-main{flex:1;min-width:0;}
.cf-name{font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cf-sub{font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px;}
.cf-muted{color:var(--text-muted);}
.cf-meter{width:64px;}
.cf-meter-track{height:5px;background:var(--track);border-radius:3px;position:relative;overflow:hidden;}
.cf-meter-fill{height:100%;border-radius:3px;transition:width .7s cubic-bezier(.22,1,.36,1);}
.cf-meter-fill.ok{background:var(--ok);}.cf-meter-fill.warn{background:var(--warn);}.cf-meter-fill.crit{background:var(--crit);}
.cf-alert-nums{font-size:11px;font-family:var(--font-mono);text-align:right;margin-bottom:3px;}
.cf-donut-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;padding:18px;}
.cf-donut{position:relative;}
.cf-donut-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.cf-donut-v{font-size:17px;font-weight:800;color:var(--text);font-family:var(--font-mono);}
.cf-donut-l{font-size:9px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;}
.cf-cat-legend{display:flex;flex-direction:column;gap:9px;width:100%;}
.cf-cat-row{display:flex;align-items:center;gap:9px;font-size:12px;}
.cf-cat-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.cf-cat-name{flex:1;color:var(--text);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cf-cat-pct{font-family:var(--font-mono);color:var(--text-muted);font-size:11px;}
.cf-cat-val{font-family:var(--font-mono);color:var(--text-dim);font-size:11px;font-weight:600;min-width:54px;text-align:right;}
.cf-rank{width:22px;height:22px;border-radius:6px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;font-family:var(--font-mono);flex-shrink:0;}
.cf-top-bar{width:100%;height:5px;background:var(--track);border-radius:3px;overflow:hidden;margin-top:5px;}
.cf-top-fill{height:100%;background:var(--brand);border-radius:3px;transition:width .8s cubic-bezier(.22,1,.36,1);}
.cf-top-val{font-size:12px;font-family:var(--font-mono);color:var(--text-dim);white-space:nowrap;font-weight:600;}
.cf-pill{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--font-mono);}
.cf-pill.ok{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);}
.cf-pill.warn{background:color-mix(in oklab,var(--warn) 14%,transparent);color:var(--warn);}
.cf-pill.info{background:var(--brand-soft);color:var(--brand);}
.cf-ped-id{font-size:11px;font-family:var(--font-mono);color:var(--text-muted);width:42px;}
.cf-ped-total{font-size:13px;font-weight:800;font-family:var(--font-mono);color:var(--text);white-space:nowrap;}
.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfShimmer 1.5s infinite;border-radius:8px;}
@keyframes cfShimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.cf-empty{padding:28px;text-align:center;color:var(--text-muted);font-size:12px;font-family:var(--font-mono);}
@media(max-width:1100px){.cf-kpi-grid{grid-template-columns:repeat(2,1fr);}.cf-row-2-1,.cf-row-3{grid-template-columns:1fr;}}
@media(max-width:560px){.cf-kpi-grid{grid-template-columns:1fr;}}
`;

const Ic = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICONS = {
  chart: <><path d="M4 4v16h16"/><path d="m7 14 3-4 3 3 4-6"/></>,
  spark: <><path d="M12 2.5 14.2 9 21 11l-6.8 2L12 19.5 9.8 13 3 11l6.8-2L12 2.5Z"/></>,
  box:   <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5"/></>,
  sun:   <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:  <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></>,
};

const Delta = ({ v }) => v == null ? null : (
  <span className={`cf-delta ${v >= 0 ? 'up' : 'down'}`}>
    {v >= 0 ? '▲' : '▼'}{Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
  </span>
);

function Donut({ items, size = 132 }) {
  const stroke = size * 0.14, r = (size - stroke) / 2 - 1, c = 2 * Math.PI * r;
  const total = items.reduce((a, x) => a + x.valor, 0) || 1;
  let acc = 0;
  return (
    <div className="cf-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} stroke="var(--track)" />
        {items.map((it, i) => {
          const frac = it.valor / total, len = Math.max(frac - 0.012, 0.001) * c;
          const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke}
            stroke={`var(--cat-${i})`} strokeLinecap="round"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc * c + (0.012 * c) / 2}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }} />;
          acc += frac;
          return el;
        })}
      </svg>
      <div className="cf-donut-c">
        <div className="cf-donut-v">{Math.round(total)}</div>
        <div className="cf-donut-l">movs</div>
      </div>
    </div>
  );
}

function Meter({ atual, minimo }) {
  const cap = Math.max(minimo * 2.5, atual, 1);
  const pct = Math.min((atual / cap) * 100, 100);
  const cls = atual === 0 ? 'crit' : atual <= minimo ? 'warn' : 'ok';
  return <div className="cf-meter"><div className="cf-meter-track"><div className={`cf-meter-fill ${cls}`} style={{ width: `${pct}%` }} /></div></div>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getDocTheme);
  const [kpis, setKpis] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [movs, setMovs] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hov, setHov] = useState(null);

  // sincroniza com o tema global (Layout) — observa mudanças no atributo data-theme
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [k,v,p,a,m,ped] = await Promise.allSettled([
          getKPIs(), getVendasPorMes(), getProdutos(),
          getAlertasEstoque(), getMovimentacoes(), getPedidos()
        ]);
        if (k.status==='fulfilled')   setKpis(k.value);
        if (v.status==='fulfilled')   setVendas(Array.isArray(v.value)?v.value:[]);
        if (p.status==='fulfilled')   setProdutos(Array.isArray(p.value)?p.value:[]);
        if (a.status==='fulfilled')   setAlertas(Array.isArray(a.value)?a.value:[]);
        if (m.status==='fulfilled')   setMovs(Array.isArray(m.value)?m.value:[]);
        if (ped.status==='fulfilled') setPedidos(Array.isArray(ped.value)?ped.value:[]);
      } finally { setLoading(false); }
    })();
  }, []);

  const mesLabel = (v) => {
    // tenta vários formatos: número (1-12), "2026-05", "05", já-nome, campo mes_num
    if (v.mes_num) return MESES[(v.mes_num - 1) % 12] || '';
    const m = v.mes;
    if (m == null) return '';
    if (typeof m === 'number') return MESES[(m - 1) % 12] || '';
    const s = String(m).trim();
    // "2026-05" ou "2026/05"
    const ym = s.match(/^\d{4}[-/](\d{1,2})$/);
    if (ym) return MESES[(parseInt(ym[1]) - 1) % 12] || '';
    // "05" ou "5"
    if (/^\d{1,2}$/.test(s)) return MESES[(parseInt(s) - 1) % 12] || '';
    // já é nome tipo "Mai"/"maio" → capitaliza 3 letras
    const nome = s.slice(0, 3);
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  };

  const barData = vendas.map(v => ({
    mes: mesLabel(v),
    total: v.total || 0,
    vendas: v.vendas || v.qtd || 0,
  }));
  const maxBar = Math.max(...barData.map(d => d.total), 1);
  const totalAno = barData.reduce((a, d) => a + d.total, 0);
  const melhorMes = barData.reduce((a, d) => d.total > (a?.total||0) ? d : a, null);

  const topProdutos = [...produtos]
    .filter(p => p.status !== 'inativo')
    .sort((a,b) => (b.preco_venda||0) - (a.preco_venda||0))
    .slice(0, 5);
  const maxTop = topProdutos[0]?.preco_venda || 1;

  const entradas = movs.filter(m => m.tipo==='entrada').reduce((a,m) => a+(m.quantidade||0), 0);
  const saidas   = movs.filter(m => m.tipo==='saida').reduce((a,m) => a+(m.quantidade||0), 0);
  const ajustes  = movs.filter(m => m.tipo==='ajuste').reduce((a,m) => a+(m.quantidade||0), 0);
  const donutData = [
    { nome:'Entradas', valor:entradas },
    { nome:'Saídas',   valor:saidas },
    { nome:'Ajustes',  valor:ajustes },
  ].filter(d => d.valor > 0);

  const pedStatus = (s) => {
    const M = { concluido:'ok', pago:'ok', entregue:'ok', pendente_entrega:'info', pendente:'warn', em_aberto:'warn', vencido:'warn', cancelado:'warn' };
    const L = { concluido:'Pago', pago:'Pago', entregue:'Entregue', pendente_entrega:'Entrega', pendente:'Pendente', em_aberto:'Aberto', vencido:'Vencido', cancelado:'Cancelado' };
    return { cls: M[s]||'ok', label: L[s]||s };
  };

  const Skel = ({ h=36, w='100%' }) => <div className="cf-skel" style={{ height:h, width:w }} />;

  return (
    <div className="cf-dash-root" data-theme={theme}>
      <style>{S}</style>

      <div className="cf-kpi-grid">
        {[
          { lbl:'Receita do mês', val:fmtBRL(kpis?.receita_mes, 0), ic:'chart', delta:kpis?.receita_delta, sub: kpis?.pedidos_hoje ? `${kpis.pedidos_hoje} pedido(s) hoje` : 'este mês' },
          { lbl:'Lucro do mês', val:fmtBRL(kpis?.lucro_mes, 0), ic:'spark', delta:kpis?.lucro_delta, sub: kpis?.margem ? `Margem ${Number(kpis.margem).toFixed(1)}%` : '—' },
          { lbl:'Produtos ativos', val:String(kpis?.total_produtos ?? '—'), ic:'box', sub: kpis?.estoque_critico>0 ? `${kpis.estoque_critico} em alerta` : 'estoque OK' },
          { lbl:'Clientes', val:String(kpis?.total_clientes ?? '—'), ic:'users', sub:'cadastrados' },
        ].map((k, i) => (
          <div key={k.lbl} className="cf-kpi" style={{ animationDelay:`${i*.06}s` }}>
            <div className="cf-kpi-top">
              <span className="cf-kpi-ic"><Ic d={ICONS[k.ic]} /></span>
              <Delta v={k.delta} />
            </div>
            <div className={`cf-kpi-val${String(k.val).length>11?' sm':''}`}>
              {loading ? <Skel h={24} w={100} /> : k.val}
            </div>
            <div className="cf-kpi-foot"><span className="cf-kpi-lbl">{k.lbl}</span></div>
            {k.sub && <div className="cf-kpi-sub">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="cf-row cf-row-2-1">
        <div className="cf-card">
          <div className="cf-card-head">
            <div><div className="cf-card-title">Faturamento mensal</div><div className="cf-card-sub">passe o mouse nas barras</div></div>
            <button className="cf-link-btn" onClick={()=>navigate('/lucros')}>Relatórios →</button>
          </div>
          {loading ? (
            <div className="cf-card-pad"><Skel h={150} /></div>
          ) : barData.length === 0 ? (
            <div className="cf-empty">Sem dados de faturamento</div>
          ) : (
            <>
              <div className="cf-bars" style={{ height:170 }}>
                {[0.25, 0.5, 0.75].map(g => (
                  <div key={g} className="cf-bars-grid" style={{ bottom:`calc(${g*100}% - 8px)` }} />
                ))}
                {barData.map((d, i) => {
                  const pct = (d.total / maxBar) * 100;
                  const on = hov === i;
                  const accent = melhorMes && d.mes === melhorMes.mes;
                  return (
                    <div key={i} className="cf-bar-col" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                      <div className="cf-bar-slot">
                        {on && (
                          <div className="cf-bar-tip">
                            <strong>{fmtBRL(d.total, 0)}</strong>
                            <span>{d.vendas} vendas · {d.mes}</span>
                          </div>
                        )}
                        <div className={`cf-bar${accent?' accent':''}${on?' hot':''}`} style={{ height:`${Math.max(pct,1.5)}%`, transitionDelay:`${i*.03}s` }} />
                      </div>
                      <div className={`cf-bar-lbl${accent?' on':''}`}>{d.mes}</div>
                    </div>
                  );
                })}
              </div>
              <div className="cf-card-foot-stats">
                <div><span className="cf-fs-l">Total no período</span><span className="cf-fs-v">{fmtBRL(totalAno, 0)}</span></div>
                {melhorMes && <div><span className="cf-fs-l">Melhor mês</span><span className="cf-fs-v">{melhorMes.mes} · {fmtCompact(melhorMes.total)}</span></div>}
                {kpis?.ticket_medio && <div><span className="cf-fs-l">Ticket médio</span><span className="cf-fs-v">{fmtBRL(kpis.ticket_medio)}</span></div>}
              </div>
            </>
          )}
        </div>

        <div className="cf-card">
          <div className="cf-card-head">
            <div><div className="cf-card-title">Alertas de estoque</div><div className="cf-card-sub">{alertas.length} produto(s)</div></div>
            <button className="cf-link-btn" onClick={()=>navigate('/estoque')}>Estoque →</button>
          </div>
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3].map(i=><Skel key={i} h={40} />)}</div>
          ) : alertas.length === 0 ? (
            <div className="cf-empty">Nenhum alerta · estoque saudável</div>
          ) : (
            <div className="cf-list">
              {alertas.slice(0, 5).map(a => (
                <div key={a.id} className="cf-row-item">
                  <span className={`cf-status-dot ${a.estoque===0?'crit':'warn'}`} />
                  <div className="cf-main">
                    <div className="cf-name">{a.nome}</div>
                    <div className="cf-sub">{a.sku || ''}</div>
                  </div>
                  <div>
                    <div className="cf-alert-nums">
                      <span style={{ color: a.estoque===0 ? 'var(--crit)' : 'var(--warn)' }}>{a.estoque}</span>
                      <span className="cf-muted"> / {a.estoque_minimo ?? a.minimo} mín</span>
                    </div>
                    <Meter atual={a.estoque} minimo={a.estoque_minimo ?? a.minimo ?? 1} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="cf-row cf-row-3">
        <div className="cf-card">
          <div className="cf-card-head"><div><div className="cf-card-title">Movimentações</div><div className="cf-card-sub">entradas vs saídas</div></div></div>
          {loading ? (
            <div className="cf-card-pad"><Skel h={130} /></div>
          ) : donutData.length === 0 ? (
            <div className="cf-empty">Sem movimentações</div>
          ) : (
            <div className="cf-donut-wrap">
              <Donut items={donutData} />
              <div className="cf-cat-legend">
                {donutData.map((c, i) => {
                  const total = donutData.reduce((a,x)=>a+x.valor,0) || 1;
                  return (
                    <div key={c.nome} className="cf-cat-row">
                      <span className="cf-cat-dot" style={{ background:`var(--cat-${i})` }} />
                      <span className="cf-cat-name">{c.nome}</span>
                      <span className="cf-cat-pct">{Math.round((c.valor/total)*100)}%</span>
                      <span className="cf-cat-val">{c.valor} un</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="cf-card">
          <div className="cf-card-head">
            <div><div className="cf-card-title">Produtos em destaque</div><div className="cf-card-sub">maior valor</div></div>
            <button className="cf-link-btn" onClick={()=>navigate('/produtos')}>Tudo →</button>
          </div>
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3].map(i=><Skel key={i} h={36} />)}</div>
          ) : topProdutos.length === 0 ? (
            <div className="cf-empty">Sem produtos</div>
          ) : (
            <div className="cf-list">
              {topProdutos.map((p, i) => (
                <div key={p.id} className="cf-row-item">
                  <div className="cf-rank">{i+1}</div>
                  <div className="cf-main">
                    <div className="cf-name">{p.nome}</div>
                    <div className="cf-top-bar"><div className="cf-top-fill" style={{ width:`${((p.preco_venda||0)/maxTop)*100}%` }} /></div>
                  </div>
                  <div className="cf-top-val">{fmtBRL(p.preco_venda, 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cf-card">
          <div className="cf-card-head">
            <div><div className="cf-card-title">Pedidos recentes</div><div className="cf-card-sub">últimos registros</div></div>
            <button className="cf-link-btn" onClick={()=>navigate('/vendas')}>Vendas →</button>
          </div>
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3].map(i=><Skel key={i} h={36} />)}</div>
          ) : pedidos.length === 0 ? (
            <div className="cf-empty">Sem pedidos recentes</div>
          ) : (
            <div className="cf-list">
              {pedidos.slice(0, 5).map(p => {
                const st = pedStatus(p.status);
                return (
                  <div key={p.id} className="cf-row-item">
                    <div className="cf-ped-id">#{p.id}</div>
                    <div className="cf-main">
                      <div className="cf-name">{p.cliente || 'Balcão'}</div>
                      <div className="cf-sub">{p.itens ?? p.num_itens ?? 0} {(p.itens ?? p.num_itens ?? 0) === 1 ? 'item' : 'itens'} · {p.data || p.criado_em || ''}</div>
                    </div>
                    <span className={`cf-pill ${st.cls}`}>{st.label}</span>
                    <div className="cf-ped-total">{fmtBRL(p.total, 0)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}