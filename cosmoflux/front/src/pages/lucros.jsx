import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = { get: url => fetch(BASE+url,{headers:h()}).then(r=>r.json()) };

const fmtBRL  = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const fmtPct  = v => `${Number(v||0).toFixed(1)}%`;
const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:22px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .35s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}

/* PERÍODO TABS */
.period-tabs{display:flex;gap:6px;background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:4px;}
.ptab{padding:7px 16px;border-radius:7px;border:none;background:transparent;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;color:rgba(232,234,237,.4);}
.ptab.active{background:#1a1d22;color:#e8eaed;box-shadow:0 1px 4px rgba(0,0,0,.3);}
.ptab:hover:not(.active){color:#e8eaed;}

/* KPIs PERÍODO */
.kpis-periodo{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.kpi{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:18px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s;animation:cardIn .4s cubic-bezier(.22,1,.36,1) both;}
.kpi:hover{border-color:rgba(255,255,255,.12);transform:translateY(-2px);}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c,#00d4aa);}
.kpi-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
.kpi-val{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed;line-height:1;margin-bottom:6px;}
.kpi-sub{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);}
.kpi-sub.green{color:#00d4aa;} .kpi-sub.red{color:#ff4757;} .kpi-sub.yellow{color:#ffd32a;}
@keyframes cardIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}

/* GRID 2 colunas */
.g2{display:grid;grid-template-columns:3fr 2fr;gap:16px;}

/* CARD */
.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06);}
.card-title{font-size:13px;font-weight:700;color:#e8eaed;}
.card-sub{font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-top:2px;}

/* GRÁFICO BARRAS MENSAL */
.chart-wrap{padding:18px 18px 10px;display:flex;flex-direction:column;gap:14px;}
.chart-bars{display:flex;align-items:flex-end;gap:4px;height:120px;}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;}
.bar-stack{width:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:1px;flex:1;}
.bar-seg{width:100%;border-radius:2px 2px 0 0;transition:height .6s cubic-bezier(.22,1,.36,1);min-height:2px;cursor:pointer;position:relative;}
.bar-seg:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100%+4px);left:50%;transform:translateX(-50%);background:#1a1d22;border:1px solid rgba(255,255,255,.1);color:#e8eaed;font-size:10px;font-family:'JetBrains Mono',monospace;padding:4px 8px;border-radius:5px;white-space:nowrap;z-index:10;}
.bar-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);}
.bar-lbl.active{color:#00d4aa;font-weight:700;}

.chart-legend{display:flex;gap:16px;flex-wrap:wrap;}
.legend-item{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(232,234,237,.5);}
.legend-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}

/* MARGEM GAUGE */
.gauge-wrap{padding:20px 18px;display:flex;flex-direction:column;align-items:center;gap:16px;}
.gauge{position:relative;width:140px;height:70px;}
.gauge-track{fill:none;stroke:rgba(255,255,255,.06);stroke-width:14;}
.gauge-fill{fill:none;stroke-width:14;stroke-linecap:round;transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1);}
.gauge-val{position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace;white-space:nowrap;}
.gauge-lbl{font-size:11px;color:rgba(232,234,237,.3);font-family:'JetBrains Mono',monospace;margin-top:-6px;}

.margin-breakdown{width:100%;display:flex;flex-direction:column;gap:8px;}
.mb-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;}
.mb-lbl{color:rgba(232,234,237,.5);}
.mb-val{font-family:'JetBrains Mono',monospace;font-weight:700;}
.mb-sep{border:none;border-top:1px solid rgba(255,255,255,.06);margin:4px 0;}

/* TABELA PRODUTOS */
.tbl-wrap{overflow:hidden;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:10px 18px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl th.r{text-align:right;}
.tbl td{padding:12px 18px;font-size:12px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}
.tbl td.r{text-align:right;}
.tbl td.green{color:#00d4aa;font-weight:700;font-family:'JetBrains Mono',monospace;}
.tbl td.red{color:#ff4757;font-family:'JetBrains Mono',monospace;}

/* rank bar */
.rank-bar-wrap{display:flex;align-items:center;gap:8px;}
.rank-track{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;max-width:80px;}
.rank-fill{height:100%;border-radius:2px;background:#00d4aa;}

/* margem badge */
.mgm-badge{display:inline-flex;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.mgm-high{background:rgba(0,212,170,.12);color:#00d4aa;}
.mgm-mid {background:rgba(255,211,42,.12);color:#ffd32a;}
.mgm-low {background:rgba(255,107,53,.12);color:#ff6b35;}
.mgm-neg {background:rgba(255,71,87,.12);color:#ff4757;}

.empty{padding:40px 20px;text-align:center;color:rgba(232,234,237,.25);font-size:12px;font-family:'JetBrains Mono',monospace;}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

@media(max-width:1100px){.kpis-periodo{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}}
@media(max-width:768px){.pg{padding:14px;gap:14px;}.kpis-periodo{grid-template-columns:1fr 1fr;}}
@media(max-width:480px){.kpis-periodo{grid-template-columns:1fr;}}
`;

// ── Gauge SVG ─────────────────────────────────────────────────────────────────
function Gauge({ pct, color }) {
  const r = 54, cx = 70, cy = 66;
  const circ = Math.PI * r;                       // semicírculo
  const dash = circ;
  const offset = circ - (Math.min(Math.max(pct,0),100) / 100) * circ;
  const gaugeColor = pct >= 30 ? '#00d4aa' : pct >= 15 ? '#ffd32a' : '#ff6b35';

  return (
    <div className="gauge">
      <svg width="140" height="78" viewBox="0 0 140 78">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14" strokeLinecap="round"/>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={gaugeColor} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={dash} strokeDashoffset={offset}
          style={{transition:'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)'}}/>
      </svg>
      <div className="gauge-val" style={{color: gaugeColor}}>{fmtPct(pct)}</div>
    </div>
  );
}

// ── PERIODO ───────────────────────────────────────────────────────────────────
const PERIODOS = [
  { key:'hoje',  label:'Hoje'    },
  { key:'mes',   label:'Este mês'},
  { key:'ano',   label:'Este ano'},
  { key:'total', label:'Total'   },
];

export default function Lucros() {
  const [resumo,   setResumo]   = useState(null);
  const [mensal,   setMensal]   = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [periodo,  setPeriodo]  = useState('mes');
  const [sortBy,   setSortBy]   = useState('lucro');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, p] = await Promise.allSettled([
        api.get('/lucros/resumo'),
        api.get('/lucros/mensal'),
        api.get('/lucros/por-produto'),
      ]);
      if (r.status === 'fulfilled') setResumo(r.value);
      if (m.status === 'fulfilled') setMensal(m.value);
      if (p.status === 'fulfilled') setProdutos(p.value);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dados = resumo?.[periodo] || {};
  const mesAtual = new Date().getMonth(); // 0-indexed

  // gráfico
  const maxReceita = Math.max(...mensal.map(m => m.receita), 1);

  // produtos ordenados
  const prodOrdenados = [...produtos].sort((a,b) => b[sortBy] - a[sortBy]);
  const maxLucro = Math.max(...produtos.map(p => p.lucro), 1);

  const margemClass = m => m >= 30 ? 'mgm-high' : m >= 15 ? 'mgm-mid' : m >= 0 ? 'mgm-low' : 'mgm-neg';

  return (
    <>
      <style>{S}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Lucros</div>
            <div className="pg-sub">Análise financeira e rentabilidade</div>
          </div>
          <div className="period-tabs">
            {PERIODOS.map(p => (
              <button key={p.key} className={`ptab${periodo===p.key?' active':''}`}
                onClick={() => setPeriodo(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* KPIs do período */}
        <div className="kpis-periodo">
          {loading ? (
            Array.from({length:4}).map((_,i) => (
              <div key={i} className="kpi" style={{'--c':'#00d4aa',animationDelay:`${i*.06}s`}}>
                <div className="skel" style={{height:12,width:'60%',marginBottom:10}}/>
                <div className="skel" style={{height:22,width:'80%'}}/>
              </div>
            ))
          ) : [
            { lbl:'Receita',   val:fmtBRL(dados.receita), sub:`${dados.pedidos||0} pedido(s)`,               c:'#00d4aa', subCls:'' },
            { lbl:'Custo',     val:fmtBRL(dados.custo),   sub:`Descontos: ${fmtBRL(dados.descontos)}`,        c:'#ff6b35', subCls:'red' },
            { lbl:'Lucro',     val:fmtBRL(dados.lucro),   sub:dados.lucro>=0?'resultado positivo':'resultado negativo', c:'#a855f7', subCls: dados.lucro>=0?'green':'red' },
            { lbl:'Margem',    val:fmtPct(dados.margem),  sub: dados.margem>=30?'margem saudável':dados.margem>=15?'margem moderada':'margem baixa', c:'#0099ff', subCls: dados.margem>=30?'green':dados.margem>=15?'yellow':'red' },
          ].map((k,i) => (
            <div key={k.lbl} className="kpi" style={{'--c':k.c,animationDelay:`${i*.06}s`}}>
              <div className="kpi-lbl">{k.lbl}</div>
              <div className="kpi-val">{k.val}</div>
              <div className={`kpi-sub ${k.subCls}`}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Gráfico mensal + Gauge */}
        <div className="g2">
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Receita × Lucro por Mês</div>
                <div className="card-sub">{new Date().getFullYear()}</div>
              </div>
            </div>
            <div className="chart-wrap">
              <div className="chart-bars">
                {mensal.map((m, i) => {
                  const hReceita = maxReceita > 0 ? (m.receita / maxReceita) * 100 : 0;
                  const hLucro   = maxReceita > 0 ? (m.lucro   / maxReceita) * 100 : 0;
                  const isAtual  = i === mesAtual;
                  return (
                    <div key={i} className="bar-col">
                      <div className="bar-stack">
                        <div className="bar-seg"
                          style={{height:`${hReceita}%`, background: isAtual ? 'rgba(0,153,255,.5)' : 'rgba(255,255,255,.08)'}}
                          data-tip={`Receita: ${fmtBRL(m.receita)}`}/>
                        <div className="bar-seg"
                          style={{height:`${hLucro}%`, background: isAtual ? '#00d4aa' : 'rgba(0,212,170,.35)'}}
                          data-tip={`Lucro: ${fmtBRL(m.lucro)}`}/>
                      </div>
                      <div className={`bar-lbl${isAtual?' active':''}`}>{MESES[i]}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chart-legend">
                <div className="legend-item"><div className="legend-dot" style={{background:'rgba(0,153,255,.5)'}}/>Receita</div>
                <div className="legend-item"><div className="legend-dot" style={{background:'#00d4aa'}}/>Lucro</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Margem de Lucro</div>
                <div className="card-sub">{PERIODOS.find(p=>p.key===periodo)?.label}</div>
              </div>
            </div>
            <div className="gauge-wrap">
              <Gauge pct={dados.margem || 0}/>
              <div className="gauge-lbl">margem líquida</div>
              <div className="margin-breakdown" style={{marginTop:8}}>
                <div className="mb-row">
                  <span className="mb-lbl">Receita total</span>
                  <span className="mb-val" style={{color:'#e8eaed'}}>{fmtBRL(dados.receita)}</span>
                </div>
                <div className="mb-row">
                  <span className="mb-lbl">(-) Custo dos produtos</span>
                  <span className="mb-val" style={{color:'#ff6b35'}}>- {fmtBRL(dados.custo)}</span>
                </div>
                {dados.descontos > 0 && (
                  <div className="mb-row">
                    <span className="mb-lbl">(-) Descontos</span>
                    <span className="mb-val" style={{color:'#ffd32a'}}>- {fmtBRL(dados.descontos)}</span>
                  </div>
                )}
                <hr className="mb-sep"/>
                <div className="mb-row">
                  <span className="mb-lbl" style={{fontWeight:700,color:'#e8eaed'}}>Lucro</span>
                  <span className="mb-val" style={{color: dados.lucro>=0?'#00d4aa':'#ff4757',fontSize:15}}>
                    {fmtBRL(dados.lucro)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela por produto */}
        <div className="card">
          <div className="card-hdr">
            <div>
              <div className="card-title">Rentabilidade por Produto</div>
              <div className="card-sub">{produtos.length} produto(s) com vendas</div>
            </div>
            <select
              style={{background:'#13161a',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,padding:'6px 12px',fontSize:12,color:'rgba(232,234,237,.7)',fontFamily:'Syne, sans-serif',outline:'none',cursor:'pointer'}}
              value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="lucro">Ordenar por lucro</option>
              <option value="receita">Ordenar por receita</option>
              <option value="margem">Ordenar por margem</option>
              <option value="qtd_vendida">Ordenar por quantidade</option>
            </select>
          </div>
          <div className="tbl-wrap">
            {loading ? (
              <div style={{padding:18,display:'flex',flexDirection:'column',gap:10}}>
                {[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:44}}/>)}
              </div>
            ) : prodOrdenados.length === 0 ? (
              <div className="empty">Nenhum produto com vendas registradas</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produto</th>
                    <th className="r">Qtd vendida</th>
                    <th className="r">Receita</th>
                    <th className="r">Custo total</th>
                    <th className="r">Lucro</th>
                    <th>Margem</th>
                    <th>Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {prodOrdenados.map((p, i) => (
                    <tr key={p.id}>
                      <td className="mono" style={{color:'rgba(232,234,237,.3)',fontSize:11}}>#{i+1}</td>
                      <td>
                        <div>{p.nome}</div>
                        {p.categoria && <div style={{fontSize:10,fontFamily:'JetBrains Mono, monospace',color:'rgba(232,234,237,.3)',marginTop:2}}>{p.categoria}</div>}
                      </td>
                      <td className="mono r">{p.qtd_vendida}</td>
                      <td className="mono r">{fmtBRL(p.receita)}</td>
                      <td className="mono r" style={{color:'#ff6b35'}}>{fmtBRL(p.custo)}</td>
                      <td className={p.lucro >= 0 ? 'green r' : 'red r'}>{fmtBRL(p.lucro)}</td>
                      <td>
                        <span className={`mgm-badge ${margemClass(p.margem)}`}>{fmtPct(p.margem)}</span>
                      </td>
                      <td>
                        <div className="rank-bar-wrap">
                          <div className="rank-track">
                            <div className="rank-fill" style={{width:`${(p.lucro/maxLucro)*100}%`}}/>
                          </div>
                          <span style={{fontSize:10,fontFamily:'JetBrains Mono, monospace',color:'rgba(232,234,237,.3)',minWidth:36}}>
                            {maxLucro>0?`${((p.lucro/maxLucro)*100).toFixed(0)}%`:'—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}