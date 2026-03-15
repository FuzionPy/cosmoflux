import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}

/* STATS */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.stat{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:16px;position:relative;overflow:hidden;transition:border-color .2s;}
.stat:hover{border-color:rgba(255,255,255,.12);}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c,#00d4aa);}
.st-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
.st-val{font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed;line-height:1;}
.st-sub{font-size:11px;color:rgba(232,234,237,.3);margin-top:5px;font-family:'JetBrains Mono',monospace;}

/* ALERTAS */
.alertas-section{background:#0e1013;border:1px solid rgba(255,71,87,.25);border-radius:12px;overflow:hidden;}
.alertas-header{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,71,87,.15);cursor:pointer;user-select:none;}
.ah-title{font-size:13px;font-weight:700;color:#ff6b35;flex:1;}
.ah-count{font-size:11px;font-family:'JetBrains Mono',monospace;background:rgba(255,71,87,.15);color:#ff4757;padding:2px 8px;border-radius:4px;}
.ah-chevron{font-size:12px;color:rgba(232,234,237,.4);transition:transform .2s;}
.ah-chevron.open{transform:rotate(180deg);}

.alerta-row{display:flex;align-items:center;gap:12px;padding:11px 18px;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.alerta-row:last-child{border-bottom:none;}
.alerta-row:hover{background:rgba(255,255,255,.02);}
.ar-nome{flex:1;font-size:13px;font-weight:600;color:#e8eaed;}
.ar-sku{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:2px;}
.ar-bar-wrap{width:120px;}
.ar-bar-labels{display:flex;justify-content:space-between;font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-bottom:4px;}
.ar-track{height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;}
.ar-fill{height:100%;border-radius:2px;transition:width .6s cubic-bezier(.22,1,.36,1);}

/* FILTROS */
.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(0,212,170,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}
.fsel{background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;font-size:13px;color:rgba(232,234,237,.7);font-family:'Syne',sans-serif;outline:none;cursor:pointer;}

/* TABELA */
.tbl-wrap{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl th.r{text-align:right;}
.tbl td{padding:13px 16px;font-size:13px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.025);}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}
.tbl td.r{text-align:right;}

.stock-cell{display:flex;align-items:center;gap:10px;}
.stock-val{font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;min-width:40px;}
.stock-bar-wrap{flex:1;max-width:80px;}
.stock-track{height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;}
.stock-fill{height:100%;border-radius:2px;}

.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.b-green {background:rgba(0,212,170,.12);color:#00d4aa;}
.b-orange{background:rgba(255,107,53,.12);color:#ff6b35;}
.b-red   {background:rgba(255,71,87,.12);color:#ff4757;}
.b-blue  {background:rgba(0,153,255,.12);color:#0099ff;}

.act-btns{display:flex;gap:6px;}
.ib{width:28px;height:28px;border-radius:6px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.04);color:rgba(232,234,237,.4);}
.ib:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.ib.entrada:hover{background:rgba(0,212,170,.15);color:#00d4aa;}
.ib.saida:hover{background:rgba(255,107,53,.15);color:#ff6b35;}
.ib.ajuste:hover{background:rgba(0,153,255,.15);color:#0099ff;}

.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

/* MODAL MOVIMENTAÇÃO */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:18px;}
.mclose:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.mbody{padding:20px 24px;display:flex;flex-direction:column;gap:14px;}
.mfoot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;justify-content:flex-end;}

/* tipo tabs */
.tipo-tabs{display:flex;gap:6px;}
.tipo-tab{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:transparent;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;color:rgba(232,234,237,.4);}
.tipo-tab.entrada.active{background:rgba(0,212,170,.12);border-color:rgba(0,212,170,.3);color:#00d4aa;}
.tipo-tab.saida.active  {background:rgba(255,107,53,.12);border-color:rgba(255,107,53,.3);color:#ff6b35;}
.tipo-tab.ajuste.active {background:rgba(0,153,255,.12); border-color:rgba(0,153,255,.3); color:#0099ff;}
.tipo-tab:not(.active):hover{background:rgba(255,255,255,.05);color:#e8eaed;}

.ff{display:flex;flex-direction:column;gap:5px;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi,.fsel2,.fta{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus,.fsel2:focus,.fta:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.fsel2 option{background:#0e1013;}
.fta{resize:vertical;min-height:60px;}
.fr2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

.preview-card{border-radius:8px;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.preview-card.entrada{background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);}
.preview-card.saida  {background:rgba(255,107,53,.05);border:1px solid rgba(255,107,53,.15);}
.preview-card.ajuste {background:rgba(0,153,255,.05); border:1px solid rgba(0,153,255,.12);}
.pc-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;}
.pc-val{font-size:15px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.pc-val.green{color:#00d4aa;} .pc-val.orange{color:#ff6b35;} .pc-val.blue{color:#0099ff;} .pc-val.red{color:#ff4757;}

.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}
.fwarn{background:rgba(255,211,42,.08);border:1px solid rgba(255,211,42,.2);border-radius:8px;padding:10px 14px;font-size:11px;color:#ffd32a;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;} .btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-saida{background:#ff6b35;color:#fff;} .btn-saida:hover{background:#ff8555;transform:translateY(-1px);}
.btn-saida:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ajuste{background:#0099ff;color:#fff;} .btn-ajuste:hover{background:#33aaff;transform:translateY(-1px);}

.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}

/* HISTORICO PANEL */
.hist-panel{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.hist-header{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.hist-title{font-size:13px;font-weight:700;color:#e8eaed;}
.hist-item{display:flex;align-items:flex-start;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.03);}
.hist-item:last-child{border-bottom:none;}
.hist-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.hist-info{flex:1;}
.hist-prod{font-size:12px;font-weight:600;color:#e8eaed;}
.hist-meta{display:flex;gap:8px;margin-top:3px;flex-wrap:wrap;}
.hist-meta span{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);}
.hist-qty{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;}

@media(max-width:1100px){.stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.pg{padding:14px;gap:14px;}.stats{grid-template-columns:1fr 1fr;}.fr2{grid-template-columns:1fr;}}
@media(max-width:480px){.stats{grid-template-columns:1fr;}}
`;

const stockColor = (atual, minimo) => {
  if (atual === 0) return '#ff4757';
  if (atual <= minimo) return '#ff6b35';
  return '#00d4aa';
};
const stockPct = (atual, minimo) => {
  const max = Math.max(minimo * 3, atual, 1);
  return Math.min((atual / max) * 100, 100);
};
const statusInfo = p => {
  if (p.estoque_atual === 0) return { cls:'b-red',    label:'ESGOTADO' };
  if (p.estoque_atual <= p.estoque_minimo) return { cls:'b-orange', label:'CRÍTICO'  };
  return { cls:'b-green', label:'OK' };
};

const MOTIVOS = {
  entrada: ['Compra de fornecedor','Devolução de cliente','Ajuste','Brinde','Outros'],
  saida:   ['Venda direta','Uso interno','Perda/Vencimento','Brinde','Outros'],
  ajuste:  ['Contagem física','Correção de sistema','Outros'],
};

const FORM_EMPTY = { tipo:'entrada', produto_id:'', quantidade:'', motivo:'', observacao:'' };

export default function Estoque() {
  const [produtos,  setProdutos]  = useState([]);
  const [alertas,   setAlertas]   = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [alertasOpen,  setAlertasOpen]  = useState(true);

  const [modal,    setModal]    = useState(null); // { produto } ou null
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, h] = await Promise.allSettled([
        api.get('/produtos'),
        api.get('/estoque/alertas'),
        api.get('/movimentacoes?limite=30'),
      ]);
      if (p.status === 'fulfilled') setProdutos(p.value);
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (h.status === 'fulfilled') setHistorico(h.value);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = produtos.filter(p => {
    const ms = !search || p.nome.toLowerCase().includes(search.toLowerCase()) || (p.sku||'').toLowerCase().includes(search.toLowerCase()) || (p.categoria||'').toLowerCase().includes(search.toLowerCase());
    const mf = !filtroStatus
      || (filtroStatus === 'ok'      && p.estoque_atual > p.estoque_minimo)
      || (filtroStatus === 'critico' && p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo)
      || (filtroStatus === 'esgotado'&& p.estoque_atual === 0);
    return ms && mf;
  });

  // stats
  const valorTotal = produtos.reduce((a,p) => a + p.estoque_atual * p.preco_custo, 0);
  const valorVenda = produtos.reduce((a,p) => a + p.estoque_atual * p.preco_venda, 0);
  const totalItens = produtos.reduce((a,p) => a + p.estoque_atual, 0);

  // produto selecionado no form
  const prodSel = produtos.find(p => p.id === parseInt(form.produto_id));
  const qtd = parseInt(form.quantidade) || 0;
  const estoqueApos = prodSel
    ? form.tipo === 'entrada' ? prodSel.estoque_atual + qtd
    : form.tipo === 'saida'   ? prodSel.estoque_atual - qtd
    : qtd  // ajuste = setar direto
    : null;

  const openModal = (produto, tipo = 'entrada') => {
    setForm({ ...FORM_EMPTY, tipo, produto_id: String(produto.id), motivo: MOTIVOS[tipo][0] });
    setFormErr('');
    setModal({ produto });
  };

  const salvar = async () => {
    if (!form.produto_id || !form.quantidade) { setFormErr('Produto e quantidade são obrigatórios.'); return; }
    if (form.tipo === 'saida' && prodSel && qtd > prodSel.estoque_atual) {
      setFormErr(`Estoque insuficiente. Disponível: ${prodSel.estoque_atual} ${prodSel.unidade}`); return;
    }
    setSaving(true); setFormErr('');
    try {
      const res = await api.post('/movimentacoes', {
        produto_id: parseInt(form.produto_id),
        tipo: form.tipo,
        quantidade: qtd,
        motivo: form.motivo || null,
        observacao: form.observacao || null,
      });
      const icons = { entrada:'↑', saida:'↓', ajuste:'⇄' };
      showToast(`${form.tipo.charAt(0).toUpperCase()+form.tipo.slice(1)} registrada! Novo estoque: ${res.estoque_novo}`, icons[form.tipo]);
      setModal(null);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const btnClass = form.tipo === 'saida' ? 'btn btn-saida' : form.tipo === 'ajuste' ? 'btn btn-ajuste' : 'btn btn-primary';

  return (
    <>
      <style>{S}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Estoque</div>
            <div className="pg-sub">{produtos.length} produto(s) · {totalItens} unidades em estoque</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          {[
            { lbl:'Produtos ativos',  val: produtos.length,                        sub:`${alertas.length} em alerta`,          c:'#00d4aa' },
            { lbl:'Valor em estoque', val: fmtBRL(valorTotal),                     sub:'pelo preço de custo',                   c:'#0099ff', small:true },
            { lbl:'Valor de venda',   val: fmtBRL(valorVenda),                     sub:'pelo preço de venda',                   c:'#a855f7', small:true },
            { lbl:'Itens críticos',   val: alertas.filter(a=>a.status==='critico').length, sub:`${alertas.filter(a=>a.status==='esgotado').length} esgotado(s)`, c:'#ff4757' },
          ].map(s => (
            <div key={s.lbl} className="stat" style={{'--c':s.c}}>
              <div className="st-lbl">{s.lbl}</div>
              <div className="st-val" style={{fontSize:s.small?15:22}}>{s.val}</div>
              <div className="st-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="alertas-section">
            <div className="alertas-header" onClick={() => setAlertasOpen(o=>!o)}>
              <span style={{fontSize:16}}>⚠</span>
              <span className="ah-title">Produtos com Estoque Crítico ou Esgotado</span>
              <span className="ah-count">{alertas.length}</span>
              <span className={`ah-chevron${alertasOpen?' open':''}`}>▼</span>
            </div>
            {alertasOpen && alertas.map(a => (
              <div key={a.id} className="alerta-row">
                <span className={`badge ${a.status==='esgotado'?'b-red':'b-orange'}`}>
                  {a.status === 'esgotado' ? 'ESGOTADO' : 'CRÍTICO'}
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="ar-nome">{a.nome}</div>
                </div>
                <div className="ar-bar-wrap">
                  <div className="ar-bar-labels">
                    <span>{a.estoque_atual} {a.unidade}</span>
                    <span>mín {a.estoque_minimo}</span>
                  </div>
                  <div className="ar-track">
                    <div className="ar-fill" style={{
                      width:`${stockPct(a.estoque_atual, a.estoque_minimo)}%`,
                      background: stockColor(a.estoque_atual, a.estoque_minimo),
                    }}/>
                  </div>
                </div>
                <button className="ib entrada" title="Registrar entrada"
                  onClick={() => openModal(produtos.find(p=>p.id===a.id)||a, 'entrada')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="filters">
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por nome, SKU ou categoria..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>}
          </div>
          <select className="fsel" value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="ok">Em estoque</option>
            <option value="critico">Crítico</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </div>

        {/* Tabela principal */}
        <div className="tbl-wrap">
          {loading ? (
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:10}}>
              {[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:48}}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◫</div>
              <div>Nenhum produto encontrado</div>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th className="r">Custo unit.</th>
                  <th className="r">Valor em estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const st  = statusInfo(p);
                  const pct = stockPct(p.estoque_atual, p.estoque_minimo);
                  const cor = stockColor(p.estoque_atual, p.estoque_minimo);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div>{p.nome}</div>
                        {p.sku && <div style={{fontSize:10,fontFamily:'JetBrains Mono, monospace',color:'rgba(232,234,237,.3)',marginTop:2}}>{p.sku}</div>}
                      </td>
                      <td style={{fontSize:12}}>{p.categoria || '—'}</td>
                      <td>
                        <div className="stock-cell">
                          <span className="stock-val" style={{color:cor}}>{p.estoque_atual}</span>
                          <div className="stock-bar-wrap">
                            <div className="stock-track">
                              <div className="stock-fill" style={{width:`${pct}%`,background:cor}}/>
                            </div>
                          </div>
                          <span style={{fontSize:11,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono, monospace'}}>{p.unidade}</span>
                        </div>
                      </td>
                      <td className="mono" style={{fontSize:12}}>{p.estoque_minimo} {p.unidade}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="mono r">{fmtBRL(p.preco_custo)}</td>
                      <td className="mono r" style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(p.estoque_atual * p.preco_custo)}</td>
                      <td>
                        <div className="act-btns">
                          <button className="ib entrada" title="Entrada" onClick={()=>openModal(p,'entrada')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                          <button className="ib saida" title="Saída" onClick={()=>openModal(p,'saida')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                          <button className="ib ajuste" title="Ajuste" onClick={()=>openModal(p,'ajuste')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Histórico recente */}
        <div className="hist-panel">
          <div className="hist-header">
            <span className="hist-title">Movimentações Recentes</span>
            <span style={{fontSize:11,fontFamily:'JetBrains Mono, monospace',color:'rgba(232,234,237,.3)'}}>últimas 30</span>
          </div>
          {historico.length === 0 ? (
            <div style={{padding:'20px',textAlign:'center',color:'rgba(232,234,237,.25)',fontSize:12,fontFamily:'JetBrains Mono, monospace'}}>
              Nenhuma movimentação ainda
            </div>
          ) : historico.map(m => (
            <div key={m.id} className="hist-item">
              <div className="hist-dot" style={{
                background: m.tipo==='entrada'?'#00d4aa':m.tipo==='saida'?'#ff6b35':'#0099ff'
              }}/>
              <div className="hist-info">
                <div className="hist-prod">{m.produto}</div>
                <div className="hist-meta">
                  <span>{m.motivo || m.tipo}</span>
                  {m.observacao && <span>{m.observacao}</span>}
                  <span>{m.data}</span>
                  {m.usuario && <span>por {m.usuario}</span>}
                </div>
              </div>
              <div className="hist-qty" style={{
                color: m.tipo==='entrada'?'#00d4aa':m.tipo==='saida'?'#ff6b35':'#0099ff'
              }}>
                {m.tipo==='entrada'?'+':m.tipo==='saida'?'-':'⇄'}{m.quantidade}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* MODAL MOVIMENTAÇÃO */}
      {modal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="mhd">
              <div>
                <div className="mtitle">{modal.produto.nome}</div>
                <div className="msub">Registrar movimentação de estoque</div>
              </div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}

              {/* Tipo tabs */}
              <div className="ff">
                <label className="fl">Tipo de Movimentação</label>
                <div className="tipo-tabs">
                  {['entrada','saida','ajuste'].map(t => (
                    <button key={t}
                      className={`tipo-tab ${t}${form.tipo===t?' active':''}`}
                      onClick={() => setForm(f=>({...f,tipo:t,motivo:MOTIVOS[t][0],quantidade:''}))}>
                      {t==='entrada'?'↑ Entrada':t==='saida'?'↓ Saída':'⇄ Ajuste'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview estoque atual */}
              {prodSel && (
                <div className={`preview-card ${form.tipo}`}>
                  <div>
                    <div className="pc-lbl">Estoque atual</div>
                    <div className="pc-val" style={{color:'#e8eaed'}}>{prodSel.estoque_atual} {prodSel.unidade}</div>
                  </div>
                  {qtd > 0 && estoqueApos !== null && (
                    <div>
                      <div className="pc-lbl">Após {form.tipo}</div>
                      <div className={`pc-val ${estoqueApos<0?'red':form.tipo==='entrada'?'green':form.tipo==='saida'?'orange':'blue'}`}>
                        {estoqueApos} {prodSel.unidade}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.tipo === 'ajuste' && (
                <div className="fwarn">⚠ O ajuste define o estoque diretamente para o valor informado.</div>
              )}

              <div className="fr2">
                <div className="ff">
                  <label className="fl">{form.tipo === 'ajuste' ? 'Novo valor do estoque' : 'Quantidade'} *</label>
                  <input className="fi" type="number" min="0" placeholder="0"
                    value={form.quantidade} onChange={e=>setForm(f=>({...f,quantidade:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">Motivo</label>
                  <select className="fsel2" value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))}>
                    {MOTIVOS[form.tipo].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="ff">
                <label className="fl">Observação</label>
                <textarea className="fta" placeholder="Detalhes adicionais..."
                  value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className={btnClass} onClick={salvar} disabled={saving || (form.tipo==='saida' && estoqueApos!==null && estoqueApos<0)}>
                {saving ? 'Salvando...' : `Registrar ${form.tipo.charAt(0).toUpperCase()+form.tipo.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}