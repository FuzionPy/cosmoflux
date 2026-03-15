import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = { get: url => fetch(BASE+url,{headers:h()}).then(r=>r.json()) };

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const fmtPct = v => `${Number(v||0).toFixed(1)}%`;
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:22px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}

/* TABS */
.tabs{display:flex;gap:4px;background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:4px;flex-wrap:wrap;}
.tab{padding:7px 16px;border-radius:7px;border:none;background:transparent;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;color:rgba(232,234,237,.4);}
.tab.active{background:#1a1d22;color:#e8eaed;box-shadow:0 1px 4px rgba(0,0,0,.3);}
.tab:hover:not(.active){color:#e8eaed;}

/* CARDS KPI */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.kpi{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:18px;position:relative;overflow:hidden;}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c);}
.kpi-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
.kpi-val{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:5px;}
.kpi-sub{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);}

/* CARDS genéricos */
.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.card-hdr{padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.card-title{font-size:13px;font-weight:700;}
.card-sub{font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-top:2px;}

/* GRID 2 col */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.g3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px;}

/* TABELA */
.tbl-wrap{overflow:auto;}
.tbl{width:100%;border-collapse:collapse;min-width:500px;}
.tbl th{text-align:left;padding:10px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl th.r{text-align:right;}
.tbl td{padding:11px 16px;font-size:12px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.tbl td:first-child{color:#e8eaed;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}
.tbl td.r{text-align:right;}
.tbl td.green{color:#00d4aa;font-weight:700;font-family:'JetBrains Mono',monospace;}
.tbl td.red{color:#ff4757;font-family:'JetBrains Mono',monospace;}

/* BADGE */
.badge{display:inline-flex;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-blue{background:rgba(0,153,255,.12);color:#0099ff;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-orange{background:rgba(255,107,53,.12);color:#ff6b35;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}

/* FILTROS PERIODO */
.period-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.fi{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 12px;font-size:12px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;width:auto;}
.fi:focus{border-color:rgba(0,212,170,.4);}
.fi[type=date]{color-scheme:dark;}

/* RANK BAR */
.rank-bar{display:flex;align-items:center;gap:8px;}
.rank-track{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;max-width:80px;}
.rank-fill{height:100%;border-radius:2px;}

/* LISTA MOVS */
.mov-item{display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.03);}
.mov-item:last-child{border-bottom:none;}
.mov-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.mov-info{flex:1;}
.mov-prod{font-size:12px;font-weight:600;color:#e8eaed;}
.mov-meta{font-size:10px;color:rgba(232,234,237,.3);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mov-qty{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;}

/* STATUS ESTOQUE */
.est-bar{width:60px;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;display:inline-block;}
.est-fill{height:100%;border-radius:2px;}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.empty{padding:40px;text-align:center;color:rgba(232,234,237,.25);font-size:12px;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}

@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.g3{grid-template-columns:1fr 1fr;}}
@media(max-width:768px){.pg{padding:14px;}.kpi-grid{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}.g3{grid-template-columns:1fr;}}
@media(max-width:480px){.kpi-grid{grid-template-columns:1fr;}}
`;

const STATUS_MAP = {
  pendente:   { cls:'b-yellow', label:'PENDENTE'   },
  confirmado: { cls:'b-blue',   label:'CONFIRMADO' },
  entregue:   { cls:'b-green',  label:'ENTREGUE'   },
  cancelado:  { cls:'b-red',    label:'CANCELADO'  },
};

const stockColor = (atual, min) => atual===0?'#ff4757':atual<=min?'#ff6b35':'#00d4aa';
const stockPct   = (atual, min) => Math.min((atual / Math.max(min*3,atual,1))*100, 100);

export default function Relatorios() {
  const [aba,       setAba]       = useState('geral');
  const [resumo,    setResumo]    = useState(null);
  const [vendas,    setVendas]    = useState([]);
  const [estoque,   setEstoque]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingV,  setLoadingV]  = useState(false);

  // filtros vendas
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.slice(0,7) + '-01';
  const [inicio, setInicio] = useState(inicioMes);
  const [fim,    setFim]    = useState(hoje);
  const [sortVendas, setSortVendas] = useState('data');

  const loadResumo = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e] = await Promise.allSettled([
        api.get('/relatorios/resumo-geral'),
        api.get('/relatorios/estoque-snapshot'),
      ]);
      if (r.status === 'fulfilled') setResumo(r.value);
      if (e.status === 'fulfilled') setEstoque(e.value);
    } finally { setLoading(false); }
  }, []);

  const loadVendas = useCallback(async () => {
    setLoadingV(true);
    try {
      const data = await api.get(`/relatorios/vendas-periodo?inicio=${inicio}&fim=${fim}`);
      setVendas(data);
    } finally { setLoadingV(false); }
  }, [inicio, fim]);

  useEffect(() => { loadResumo(); }, [loadResumo]);
  useEffect(() => { if (aba === 'vendas') loadVendas(); }, [aba, loadVendas]);

  // stats vendas
  const totalVendas   = vendas.reduce((a,v)=>a+v.total, 0);
  const totalLucro    = vendas.reduce((a,v)=>a+v.lucro, 0);
  const ticketMedio   = vendas.length ? totalVendas/vendas.length : 0;

  const vendasSorted = [...vendas].sort((a,b) => {
    if (sortVendas==='total') return b.total-a.total;
    if (sortVendas==='lucro') return b.lucro-a.lucro;
    return new Date(b.data_raw||0) - new Date(a.data_raw||0);
  });

  // estoque
  const estoqueOrdenado = [...estoque].sort((a,b)=>b.valor_estoque-a.valor_estoque);
  const valorTotalEstoque = estoque.reduce((a,p)=>a+p.valor_estoque, 0);
  const esgotados = estoque.filter(p=>p.status==='esgotado').length;
  const criticos  = estoque.filter(p=>p.status==='critico').length;

  return (
    <>
      <style>{S}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Relatórios</div>
            <div className="pg-sub">Visão geral e análises do negócio</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key:'geral',   label:'Resumo Geral'  },
            { key:'vendas',  label:'Vendas'         },
            { key:'estoque', label:'Estoque'        },
          ].map(t => (
            <button key={t.key} className={`tab${aba===t.key?' active':''}`}
              onClick={()=>setAba(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── ABA GERAL ── */}
        {aba === 'geral' && (
          <>
            {loading ? (
              <div className="kpi-grid">{[1,2,3,4].map(i=><div key={i} className="skel" style={{height:90}}/>)}</div>
            ) : resumo && (
              <>
                <div className="kpi-grid">
                  {[
                    { lbl:'Receita total',  val:fmtBRL(resumo.financeiro.receita_total),  sub:`${resumo.totais.pedidos} pedidos`, c:'#00d4aa' },
                    { lbl:'Lucro total',    val:fmtBRL(resumo.financeiro.lucro_total),    sub:`Margem ${fmtPct(resumo.financeiro.margem)}`, c:'#a855f7' },
                    { lbl:'Ticket médio',  val:fmtBRL(resumo.financeiro.ticket_medio),   sub:'por pedido', c:'#0099ff' },
                    { lbl:'Valor estoque', val:fmtBRL(resumo.financeiro.valor_estoque),  sub:`Venda: ${fmtBRL(resumo.financeiro.valor_estoque_venda)}`, c:'#ff6b35', small:true },
                  ].map(k => (
                    <div key={k.lbl} className="kpi" style={{'--c':k.c}}>
                      <div className="kpi-lbl">{k.lbl}</div>
                      <div className="kpi-val" style={{fontSize:k.small?14:20}}>{k.val}</div>
                      <div className="kpi-sub">{k.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="g2">
                  {/* Totais */}
                  <div className="card">
                    <div className="card-hdr"><div className="card-title">Totais do Sistema</div></div>
                    <div style={{padding:'18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      {[
                        { lbl:'Clientes',     val:resumo.totais.clientes,     c:'#00d4aa' },
                        { lbl:'Produtos',     val:resumo.totais.produtos,     c:'#0099ff' },
                        { lbl:'Fornecedores', val:resumo.totais.fornecedores, c:'#a855f7' },
                        { lbl:'Pedidos',      val:resumo.totais.pedidos,      c:'#ff6b35' },
                      ].map(t => (
                        <div key={t.lbl} style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:14,borderLeft:`2px solid ${t.c}`}}>
                          <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.1em'}}>{t.lbl}</div>
                          <div style={{fontSize:22,fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:t.c}}>{t.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top produtos */}
                  <div className="card">
                    <div className="card-hdr">
                      <div><div className="card-title">Top 5 Produtos</div><div className="card-sub">por quantidade vendida</div></div>
                    </div>
                    {resumo.top_produtos.length === 0 ? (
                      <div className="empty">Nenhuma venda registrada</div>
                    ) : (
                      <div style={{padding:'8px 0'}}>
                        {resumo.top_produtos.map((p,i) => (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                            <div style={{width:20,height:20,borderRadius:5,background:'rgba(0,212,170,.1)',color:'#00d4aa',fontSize:10,fontWeight:800,fontFamily:'JetBrains Mono,monospace',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              {i+1}
                            </div>
                            <div style={{flex:1,fontSize:13,fontWeight:600,color:'#e8eaed',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                            <div style={{fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.4)'}}>{p.qtd_vendida} un.</div>
                            <div style={{fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'#00d4aa',fontWeight:700}}>{fmtBRL(p.receita)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Movimentações recentes */}
                <div className="card">
                  <div className="card-hdr">
                    <div><div className="card-title">Movimentações Recentes</div><div className="card-sub">últimas 10</div></div>
                  </div>
                  {resumo.movimentacoes_recentes.map((m,i) => (
                    <div key={i} className="mov-item">
                      <div className="mov-dot" style={{background:m.tipo==='entrada'?'#00d4aa':m.tipo==='saida'?'#ff6b35':'#0099ff'}}/>
                      <div className="mov-info">
                        <div className="mov-prod">{m.produto}</div>
                        <div className="mov-meta">{m.motivo||m.tipo} · {m.data}</div>
                      </div>
                      <div className="mov-qty" style={{color:m.tipo==='entrada'?'#00d4aa':m.tipo==='saida'?'#ff6b35':'#0099ff'}}>
                        {m.tipo==='entrada'?'+':m.tipo==='saida'?'-':'⇄'}{m.quantidade}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── ABA VENDAS ── */}
        {aba === 'vendas' && (
          <>
            <div className="period-filters">
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'rgba(232,234,237,.4)'}}>De</span>
                <input className="fi" type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/>
                <span style={{fontSize:12,color:'rgba(232,234,237,.4)'}}>até</span>
                <input className="fi" type="date" value={fim} onChange={e=>setFim(e.target.value)}/>
                <button className="btn btn-primary" onClick={loadVendas}>Filtrar</button>
              </div>
              <select className="fi" value={sortVendas} onChange={e=>setSortVendas(e.target.value)}>
                <option value="data">Ordenar por data</option>
                <option value="total">Ordenar por valor</option>
                <option value="lucro">Ordenar por lucro</option>
              </select>
            </div>

            {/* stats do período */}
            <div className="kpi-grid">
              {[
                { lbl:'Pedidos',      val:vendas.length,         sub:'no período selecionado', c:'#0099ff' },
                { lbl:'Receita',      val:fmtBRL(totalVendas),   sub:'total bruto',            c:'#00d4aa' },
                { lbl:'Lucro',        val:fmtBRL(totalLucro),    sub:`Margem ${vendas.length?fmtPct(totalLucro/totalVendas*100):'0%'}`, c:'#a855f7' },
                { lbl:'Ticket médio', val:fmtBRL(ticketMedio),   sub:'por pedido',             c:'#ff6b35' },
              ].map(k => (
                <div key={k.lbl} className="kpi" style={{'--c':k.c}}>
                  <div className="kpi-lbl">{k.lbl}</div>
                  <div className="kpi-val" style={{fontSize:typeof k.val==='string'&&k.val.length>12?14:20}}>{k.val}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">Pedidos do Período</div><div className="card-sub">{vendas.length} resultado(s)</div></div>
              </div>
              <div className="tbl-wrap">
                {loadingV ? (
                  <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
                    {[1,2,3,4].map(i=><div key={i} className="skel" style={{height:40}}/>)}
                  </div>
                ) : vendasSorted.length === 0 ? (
                  <div className="empty">Nenhuma venda no período selecionado</div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr><th>#</th><th>Cliente</th><th>Data</th><th>Itens</th><th className="r">Total</th><th className="r">Lucro</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {vendasSorted.map(v => {
                        const st = STATUS_MAP[v.status]||{cls:'b-gray',label:v.status};
                        return (
                          <tr key={v.id}>
                            <td className="mono" style={{color:'rgba(232,234,237,.3)',fontSize:11}}>#{v.id}</td>
                            <td>{v.cliente}</td>
                            <td className="mono" style={{fontSize:11}}>{v.data}</td>
                            <td className="mono">{v.itens}</td>
                            <td className="mono r" style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(v.total)}</td>
                            <td className={`r ${v.lucro>=0?'green':'red'}`}>{fmtBRL(v.lucro)}</td>
                            <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ABA ESTOQUE ── */}
        {aba === 'estoque' && (
          <>
            <div className="kpi-grid">
              {[
                { lbl:'Produtos',       val:estoque.length,              sub:'ativos no sistema',           c:'#00d4aa' },
                { lbl:'Valor estoque',  val:fmtBRL(valorTotalEstoque),   sub:'pelo preço de custo',         c:'#0099ff', small:true },
                { lbl:'Críticos',       val:criticos,                    sub:'abaixo do mínimo',            c:'#ff6b35' },
                { lbl:'Esgotados',      val:esgotados,                   sub:'sem estoque',                 c:'#ff4757' },
              ].map(k => (
                <div key={k.lbl} className="kpi" style={{'--c':k.c}}>
                  <div className="kpi-lbl">{k.lbl}</div>
                  <div className="kpi-val" style={{fontSize:k.small?14:20}}>{k.val}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">Snapshot do Estoque</div><div className="card-sub">ordenado por valor</div></div>
              </div>
              <div className="tbl-wrap">
                {loading ? (
                  <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
                    {[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:40}}/>)}
                  </div>
                ) : estoqueOrdenado.length === 0 ? (
                  <div className="empty">Nenhum produto cadastrado</div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Produto</th><th>Categoria</th><th>Fornecedor</th>
                        <th className="r">Estoque</th><th>Nível</th>
                        <th className="r">Custo unit.</th><th className="r">Valor estoque</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoqueOrdenado.map(p => {
                        const cor = stockColor(p.estoque_atual, p.estoque_minimo);
                        const pct = stockPct(p.estoque_atual, p.estoque_minimo);
                        const st  = p.status==='esgotado'?{cls:'b-red',label:'ESGOTADO'}:
                                    p.status==='critico' ?{cls:'b-orange',label:'CRÍTICO'}:
                                                          {cls:'b-green',label:'OK'};
                        return (
                          <tr key={p.id}>
                            <td>
                              {p.nome}
                              {p.sku&&<div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.3)'}}>{p.sku}</div>}
                            </td>
                            <td style={{fontSize:11}}>{p.categoria||'—'}</td>
                            <td style={{fontSize:11}}>{p.fornecedor||'—'}</td>
                            <td className="mono r" style={{color:cor,fontWeight:700}}>{p.estoque_atual} {p.unidade}</td>
                            <td>
                              <div className="est-bar">
                                <div className="est-fill" style={{width:`${pct}%`,background:cor}}/>
                              </div>
                            </td>
                            <td className="mono r">{fmtBRL(p.preco_custo)}</td>
                            <td className="mono r" style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(p.valor_estoque)}</td>
                            <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}