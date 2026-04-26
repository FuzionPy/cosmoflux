import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getKPIs, getVendasPorMes, getProdutos,
  getAlertasEstoque, getMovimentacoes, getPedidos
} from '../services/api';

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const COLORS  = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757','#00b3de','#7c3aed'];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.dash{padding:24px;display:flex;flex-direction:column;gap:18px;font-family:'Syne',sans-serif;color:#e8eaed;}

/* KPI GRID */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.kpi{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px 18px;position:relative;overflow:hidden;transition:all .2s;cursor:default;animation:up .4s cubic-bezier(.22,1,.36,1) both;}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c);}
.kpi::after{content:'';position:absolute;top:0;right:0;width:80px;height:80px;background:radial-gradient(circle at top right,var(--c) 0%,transparent 70%);opacity:.06;pointer-events:none;}
.kpi:hover{border-color:rgba(255,255,255,.12);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3);}
.kpi-lbl{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.kpi-val{font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed;line-height:1;margin-bottom:6px;}
.kpi-val.sm{font-size:15px;}
.kpi-sub{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);display:flex;align-items:center;gap:4px;}
.kpi-sub.up{color:#00d4aa;}
.kpi-sub.down{color:#ff4757;}
.kpi-icon{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:15px;}

/* ROW LAYOUT */
.row{display:grid;gap:14px;}
.row-3-1{grid-template-columns:3fr 1fr;}
.row-2-1{grid-template-columns:2fr 1fr;}
.row-1-1{grid-template-columns:1fr 1fr;}
.row-1-1-1{grid-template-columns:1fr 1fr 1fr;}

/* CARD */
.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;animation:up .5s cubic-bezier(.22,1,.36,1) both;}
.card-hdr{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.card-title{font-size:13px;font-weight:700;color:#e8eaed;}
.card-sub{font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.card-body{padding:18px;}

/* CHART BARS */
.chart-area{padding:16px 18px 0;position:relative;}
.chart-grid-lines{position:absolute;top:0;left:18px;right:18px;bottom:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;}
.chart-grid-line{width:100%;height:1px;background:rgba(255,255,255,.04);}
.bars-wrap{display:flex;align-items:flex-end;gap:4px;height:120px;position:relative;z-index:1;}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;}
.bar-track{width:100%;flex:1;display:flex;align-items:flex-end;position:relative;}
.bar{width:100%;border-radius:4px 4px 0 0;transition:all .6s cubic-bezier(.22,1,.36,1);position:relative;min-height:3px;}
.bar:hover{filter:brightness(1.3);}
.bar-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1a1d22;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 8px;font-size:11px;font-family:'JetBrains Mono',monospace;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:10;}
.bar-col:hover .bar-tooltip{opacity:1;}
.bar-lbl{font-size:9px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;padding-bottom:8px;}
.chart-footer{display:flex;gap:20px;padding:12px 18px;border-top:1px solid rgba(255,255,255,.04);margin-top:4px;}
.chart-stat-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;}
.chart-stat-val{font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace;}

/* DONUT */
.donut-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px;}
.donut-legend{display:flex;flex-direction:column;gap:8px;width:100%;}
.legend-row{display:flex;align-items:center;gap:8px;font-size:12px;}
.legend-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}
.legend-nome{flex:1;color:#e8eaed;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.legend-pct{font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.4);font-size:11px;}

/* ALERTAS compact */
.alerta-list{display:flex;flex-direction:column;}
.alerta-row{display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.alerta-row:last-child{border-bottom:none;}
.alerta-row:hover{background:rgba(255,255,255,.02);}
.alerta-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.alerta-nome{flex:1;font-size:12px;font-weight:600;color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.alerta-qty{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);}
.alerta-badge{display:inline-flex;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.ab-red{background:rgba(255,71,87,.12);color:#ff4757;}
.ab-orange{background:rgba(255,107,53,.12);color:#ff6b35;}

/* MOVS */
.mov-row{display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,.03);}
.mov-row:last-child{border-bottom:none;}
.mov-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
.mov-info{flex:1;min-width:0;}
.mov-prod{font-size:12px;font-weight:600;color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mov-meta{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:2px;}
.mov-qty{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;white-space:nowrap;}

/* PEDIDOS */
.ped-row{display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,.03);}
.ped-row:last-child{border-bottom:none;}
.ped-num{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);width:28px;}
.ped-info{flex:1;min-width:0;}
.ped-cli{font-size:12px;font-weight:600;color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ped-data{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:2px;}
.ped-val{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa;white-space:nowrap;}

/* TOP PRODUTOS */
.top-row{display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,.03);}
.top-row:last-child{border-bottom:none;}
.top-rank{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;font-family:'JetBrains Mono',monospace;flex-shrink:0;}
.top-nome{flex:1;font-size:12px;font-weight:600;color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.top-bar-wrap{width:60px;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;}
.top-bar-fill{height:100%;border-radius:2px;transition:width .8s cubic-bezier(.22,1,.36,1);}
.top-qty{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.4);white-space:nowrap;min-width:40px;text-align:right;}

.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-blue{background:rgba(0,153,255,.12);color:#0099ff;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-orange{background:rgba(255,107,53,.12);color:#ff6b35;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.empty{padding:28px;text-align:center;color:rgba(232,234,237,.25);font-size:12px;font-family:'JetBrains Mono',monospace;}

.btn-xs{display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);font-family:'Syne',sans-serif;font-size:11px;font-weight:600;cursor:pointer;color:rgba(232,234,237,.5);transition:all .15s;white-space:nowrap;}
.btn-xs:hover{background:rgba(255,255,255,.08);color:#e8eaed;}

@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.row-3-1,.row-2-1{grid-template-columns:1fr;}}
@media(max-width:768px){.dash{padding:14px;gap:12px;}.row-1-1,.row-1-1-1{grid-template-columns:1fr;}}
`;

// ── Donut SVG ─────────────────────────────────────────────────────
function DonutChart({ items, size=110 }) {
  const CX = size/2, R = size*0.38, STROKE = size*0.13;
  const circum = 2*Math.PI*R;
  const tot = items.reduce((a,i)=>a+i.v,0)||1;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={STROKE}/>
      {items.map((it,i)=>{
        const pct = it.v/tot;
        const dash = pct*circum;
        const el = (
          <circle key={i} cx={CX} cy={CX} r={R} fill="none"
            stroke={COLORS[i%COLORS.length]} strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circum-dash}`}
            strokeDashoffset={-(off)*circum}
            strokeLinecap="butt"
            style={{transformOrigin:'center',transform:'rotate(-90deg)',transition:'stroke-dasharray .8s ease'}}/>
        );
        off += pct;
        return el;
      })}
      <text x={CX} y={CX-5} textAnchor="middle" fill="rgba(232,234,237,.9)" fontSize={size*.15} fontWeight="800" fontFamily="JetBrains Mono,monospace">{tot}</text>
      <text x={CX} y={CX+size*.1} textAnchor="middle" fill="rgba(232,234,237,.3)" fontSize={size*.07} fontFamily="JetBrains Mono,monospace">total</text>
    </svg>
  );
}

// ── Bar Chart interativo ──────────────────────────────────────────
function BarChart({ data }) {
  const [hov, setHov] = useState(null);
  const mes = new Date().getMonth();
  const max = Math.max(...data.map(d=>d.total), 1);
  const totalAno = data.reduce((a,d)=>a+d.total,0);
  const melhorMes = data.reduce((a,d)=>d.total>a.total?d:a, data[0]||{});

  return (
    <>
      <div className="chart-area">
        <div className="chart-grid-lines">
          {[1,2,3].map(i=><div key={i} className="chart-grid-line"/>)}
        </div>
        <div className="bars-wrap">
          {data.map((d,i)=>{
            const pct = (d.total/max)*100;
            const isHov = hov===i;
            const isMes = i===mes;
            const color = isMes ? '#00d4aa' : isHov ? 'rgba(0,212,170,.5)' : 'rgba(255,255,255,.08)';
            return (
              <div key={i} className="bar-col"
                onMouseEnter={()=>setHov(i)}
                onMouseLeave={()=>setHov(null)}>
                <div className="bar-track">
                  <div className="bar" style={{height:`${Math.max(pct,2)}%`,background:color,boxShadow:isMes?`0 0 12px rgba(0,212,170,.3)`:isHov?`0 0 8px rgba(0,212,170,.15)`:'none'}}>
                    {(isHov||isMes) && (
                      <div className="bar-tooltip">
                        {MESES[i]}: {fmtBRL(d.total)}<br/>
                        <span style={{color:'rgba(232,234,237,.4)',fontSize:10}}>{d.count||0} pedido(s)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bar-lbl" style={{color:isMes?'#00d4aa':undefined}}>{MESES[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="chart-footer">
        <div>
          <div className="chart-stat-lbl">Faturamento Anual</div>
          <div className="chart-stat-val" style={{color:'#00d4aa',fontSize:14}}>{fmtBRL(totalAno)}</div>
        </div>
        {melhorMes?.total>0 && (
          <div>
            <div className="chart-stat-lbl">Melhor Mês</div>
            <div className="chart-stat-val" style={{color:'#a855f7',fontSize:14}}>{MESES[data.indexOf(melhorMes)]} — {fmtBRL(melhorMes.total)}</div>
          </div>
        )}
        <div>
          <div className="chart-stat-lbl">Mês Atual</div>
          <div className="chart-stat-val" style={{color:'#0099ff',fontSize:14}}>{fmtBRL(data[mes]?.total||0)}</div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis,     setKpis]     = useState(null);
  const [vendas,   setVendas]   = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [alertas,  setAlertas]  = useState([]);
  const [movs,     setMovs]     = useState([]);
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [k,v,p,a,m,ped] = await Promise.allSettled([
          getKPIs(), getVendasPorMes(), getProdutos(),
          getAlertasEstoque(), getMovimentacoes(), getPedidos()
        ]);
        if (k.status==='fulfilled')   setKpis(k.value);
        if (v.status==='fulfilled')   setVendas(v.value);
        if (p.status==='fulfilled')   setProdutos(p.value);
        if (a.status==='fulfilled')   setAlertas(a.value);
        if (m.status==='fulfilled')   setMovs(m.value);
        if (ped.status==='fulfilled') setPedidos(ped.value);
      } finally { setLoading(false); }
    })();
  }, []);

  // Top produtos por estoque mais vendidos (proxy: menor estoque = mais saiu)
  const topProdutos = [...produtos]
    .filter(p=>p.status!=='inativo')
    .sort((a,b)=>b.preco_venda-a.preco_venda)
    .slice(0,5);
  const maxPV = topProdutos[0]?.preco_venda||1;

  // Donut de movimentações
  const entradas = movs.filter(m=>m.tipo==='entrada').reduce((a,m)=>a+m.quantidade,0);
  const saidas   = movs.filter(m=>m.tipo==='saida').reduce((a,m)=>a+m.quantidade,0);
  const donutData = [
    {v:entradas,label:'Entradas'},
    {v:saidas,  label:'Saídas'},
  ].filter(d=>d.v>0);

  const alertasLimitados = alertas.slice(0,5);
  const temMaisAlertas   = alertas.length > 5;

  const statusBadge = s => {
    const M = {concluido:'b-green',entregue:'b-green',pendente_entrega:'b-yellow',pendente:'b-yellow',cancelado:'b-red',pago:'b-green',em_aberto:'b-yellow',vencido:'b-red'};
    const L = {concluido:'PAGO',entregue:'ENTREGUE',pendente_entrega:'ENTREGA',pendente:'PENDENTE',cancelado:'CANCELADO',pago:'PAGO',em_aberto:'ABERTO',vencido:'VENCIDO'};
    return <span className={`badge ${M[s]||'b-gray'}`}>{L[s]||s}</span>;
  };

  const Skel = ({h=36,w='100%'}) => <div className="skel" style={{height:h,width:w}}/>;

  return (
    <>
      <style>{S}</style>
      <div className="dash">

        {/* ── KPIs ── */}
        <div className="kpi-grid">
          {[
            { lbl:'Receita do Mês',   val:fmtBRL(kpis?.receita_mes),            icon:'◈', c:'#00d4aa', sub: kpis?.pedidos_hoje ? `${kpis.pedidos_hoje} pedido(s) hoje` : 'este mês', up:true },
            { lbl:'Lucro do Mês',     val:fmtBRL(kpis?.lucro_mes),              icon:'◎', c:'#a855f7', sub: kpis?.margem ? `Margem ${Number(kpis.margem).toFixed(1)}%` : '—' },
            { lbl:'Produtos Ativos',  val:String(kpis?.total_produtos??'—'),     icon:'◆', c:'#0099ff', sub: kpis?.estoque_critico>0?`${kpis.estoque_critico} críticos`:'Estoque OK', down:kpis?.estoque_critico>0 },
            { lbl:'Clientes',         val:String(kpis?.total_clientes??'—'),     icon:'◯', c:'#ff6b35', sub:'cadastrados' },
          ].map((k,i)=>(
            <div key={k.lbl} className="kpi" style={{'--c':k.c,animationDelay:`${i*.07}s`}}>
              <div className="kpi-icon">{k.icon}</div>
              <div className="kpi-lbl">{k.lbl}</div>
              <div className={`kpi-val${String(k.val).length>10?' sm':''}`}>
                {loading ? <Skel h={22} w={90}/> : k.val}
              </div>
              <div className={`kpi-sub${k.up?' up':k.down?' down':''}`}>
                {k.down ? '▼' : k.up ? '▲' : ''} {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Gráfico + Alertas ── */}
        <div className="row row-3-1">
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Faturamento Mensal</div>
                <div className="card-sub">Passe o mouse sobre as barras</div>
              </div>
              <button className="btn-xs" onClick={()=>navigate('/relatorios')}>Relatórios →</button>
            </div>
            {loading ? <div style={{padding:18}}><Skel h={120}/></div> : <BarChart data={vendas}/>}
          </div>

          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Alertas de Estoque</div>
                <div className="card-sub">{alertas.length} produto(s)</div>
              </div>
              {alertas.length>0 && <button className="btn-xs" onClick={()=>navigate('/estoque')}>Ver →</button>}
            </div>
            {loading ? <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}><Skel h={28}/><Skel h={28}/><Skel h={28}/></div>
            : alertas.length===0 ? <div className="empty">✓ Estoque em ordem</div>
            : (
              <div className="alerta-list">
                {alertasLimitados.map((a,i)=>(
                  <div key={i} className="alerta-row">
                    <div className="alerta-dot" style={{background:a.status==='esgotado'?'#ff4757':'#ff6b35'}}/>
                    <div className="alerta-nome">{a.nome}</div>
                    <div className="alerta-qty">{a.estoque_atual}/{a.estoque_minimo}</div>
                    <span className={`alerta-badge ${a.status==='esgotado'?'ab-red':'ab-orange'}`}>
                      {a.status==='esgotado'?'ZERO':'BAIXO'}
                    </span>
                  </div>
                ))}
                {temMaisAlertas && (
                  <div style={{padding:'8px 18px',fontSize:11,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',borderTop:'1px solid rgba(255,255,255,.04)'}}>
                    +{alertas.length-5} mais...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Movimentações donut + Top produtos + Pedidos ── */}
        <div className="row row-1-1-1">

          {/* Donut movimentações */}
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Movimentações</div>
                <div className="card-sub">entradas vs saídas</div>
              </div>
            </div>
            {loading ? <div style={{padding:18}}><Skel h={110}/></div>
            : donutData.length===0 ? <div className="empty">Sem movimentações</div>
            : (
              <div className="donut-wrap">
                <DonutChart items={donutData}/>
                <div className="donut-legend">
                  {donutData.map((d,i)=>(
                    <div key={i} className="legend-row">
                      <div className="legend-dot" style={{background:COLORS[i]}}/>
                      <div className="legend-nome">{d.label}</div>
                      <div className="legend-pct">{d.v} un.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top produtos */}
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Top Produtos</div>
                <div className="card-sub">por preço de venda</div>
              </div>
              <button className="btn-xs" onClick={()=>navigate('/produtos')}>Ver →</button>
            </div>
            {loading ? <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4,5].map(i=><Skel key={i} h={28}/>)}</div>
            : topProdutos.length===0 ? <div className="empty">Sem produtos</div>
            : topProdutos.map((p,i)=>(
              <div key={p.id} className="top-row">
                <div className="top-rank" style={{background:`${COLORS[i%COLORS.length]}18`,color:COLORS[i%COLORS.length]}}>{i+1}</div>
                <div className="top-nome">{p.nome}</div>
                <div className="top-bar-wrap">
                  <div className="top-bar-fill" style={{width:`${(p.preco_venda/maxPV)*100}%`,background:COLORS[i%COLORS.length]}}/>
                </div>
                <div className="top-qty">{fmtBRL(p.preco_venda)}</div>
              </div>
            ))}
          </div>

          {/* Pedidos recentes */}
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Vendas Recentes</div>
                <div className="card-sub">últimas registradas</div>
              </div>
              <button className="btn-xs" onClick={()=>navigate('/vendas')}>Ver →</button>
            </div>
            {loading ? <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><Skel key={i} h={40}/>)}</div>
            : pedidos.length===0 ? <div className="empty">Nenhuma venda</div>
            : pedidos.slice(0,5).map((p,i)=>(
              <div key={i} className="ped-row">
                <div className="ped-num">#{p.id}</div>
                <div className="ped-info">
                  <div className="ped-cli">{p.cliente||'Balcão'}</div>
                  <div className="ped-data">{p.data}</div>
                </div>
                <div className="ped-val">{fmtBRL(p.total)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Movimentações recentes ── */}
        <div className="card">
          <div className="card-hdr">
            <div>
              <div className="card-title">Últimas Movimentações</div>
              <div className="card-sub">entradas e saídas de estoque</div>
            </div>
            <button className="btn-xs" onClick={()=>navigate('/entradas')}>Ver entradas →</button>
          </div>
          {loading ? <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4,5].map(i=><Skel key={i} h={36}/>)}</div>
          : movs.length===0 ? <div className="empty">Sem movimentações</div>
          : movs.slice(0,6).map((m,i)=>{
            const ent = m.tipo==='entrada';
            return (
              <div key={i} className="mov-row">
                <div className="mov-icon" style={{background:ent?'rgba(0,212,170,.08)':'rgba(255,107,53,.08)',color:ent?'#00d4aa':'#ff6b35'}}>
                  {ent?'↑':'↓'}
                </div>
                <div className="mov-info">
                  <div className="mov-prod">{m.produto}</div>
                  <div className="mov-meta">{m.motivo||m.tipo} · {m.data}</div>
                </div>
                <div className="mov-qty" style={{color:ent?'#00d4aa':'#ff6b35'}}>
                  {ent?'+':'-'}{m.quantidade} un
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}