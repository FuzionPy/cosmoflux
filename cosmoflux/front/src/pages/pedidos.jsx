import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:   url       => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post:  (url,b)   => fetch(BASE+url,{method:'POST',  headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  patch: (url,b)   => fetch(BASE+url,{method:'PATCH', headers:h(),body:JSON.stringify(b)}).then(r=>r.json()),
  del:   url       => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const STATUS_MAP = {
  pendente:   { cls:'b-yellow', label:'PENDENTE'  },
  confirmado: { cls:'b-blue',   label:'CONFIRMADO'},
  entregue:   { cls:'b-green',  label:'ENTREGUE'  },
  cancelado:  { cls:'b-red',    label:'CANCELADO' },
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}

.stats{display:flex;gap:12px;flex-wrap:wrap;}
.stat{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:120px;}
.st-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.st-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.st-lbl{font-size:11px;color:rgba(232,234,237,.35);margin-top:1px;}

.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(0,212,170,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}
.fsel{background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;font-size:13px;color:rgba(232,234,237,.7);font-family:'Syne',sans-serif;outline:none;cursor:pointer;}

.tbl-wrap{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl td{padding:13px 16px;font-size:13px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);color:#e8eaed;cursor:pointer;}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}

.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.b-green {background:rgba(0,212,170,.12);color:#00d4aa;}
.b-blue  {background:rgba(0,153,255,.12);color:#0099ff;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-red   {background:rgba(255,71,87,.12);color:#ff4757;}
.b-gray  {background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}
.b-orange{background:rgba(255,107,53,.12);color:#ff6b35;}

.act-btns{display:flex;gap:6px;}
.ib{width:28px;height:28px;border-radius:6px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.04);color:rgba(232,234,237,.4);}
.ib:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.ib.danger:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.ib.success:hover{background:rgba(0,212,170,.15);color:#00d4aa;}

.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

/* DETAIL PANEL */
.dp{position:fixed;right:0;top:0;bottom:0;width:400px;background:#0e1013;border-left:1px solid rgba(255,255,255,.08);z-index:150;overflow-y:auto;animation:dpIn .3s cubic-bezier(.22,1,.36,1) both;display:flex;flex-direction:column;}
.dp::-webkit-scrollbar{width:4px}.dp::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
@keyframes dpIn{from{transform:translateX(100%)}to{transform:none}}
.dp-head{padding:22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.dp-id{font-size:22px;font-weight:800;color:#e8eaed;}
.dp-meta{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:3px;}
.dp-body{padding:20px 22px;flex:1;display:flex;flex-direction:column;gap:20px;}
.dp-sec{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.dp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.dp-fl{font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:3px;}
.dp-fv{font-size:14px;font-weight:600;color:#e8eaed;}
.dp-fv.green{color:#00d4aa;} .dp-fv.mono{font-family:'JetBrains Mono',monospace;}
.item-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.item-row:last-child{border-bottom:none;}
.item-nome{flex:1;font-size:13px;font-weight:500;color:#e8eaed;}
.item-qty{font-size:12px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.4);}
.item-val{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa;}
.dp-foot{padding:14px 22px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}

.status-sel{background:#13161a;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;font-size:12px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;cursor:pointer;flex:1;}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:620px;max-height:90vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
.modal::-webkit-scrollbar{width:4px}.modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:22px 24px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:18px;}
.mclose:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.mbody{padding:22px 24px;display:flex;flex-direction:column;gap:16px;}
.mfoot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;justify-content:flex-end;}

.fr2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ff{display:flex;flex-direction:column;gap:5px;}
.ff.full{grid-column:1/-1;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi,.fsel,.fta{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus,.fsel:focus,.fta:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.fsel option{background:#0e1013;}

/* itens do pedido */
.item-list{display:flex;flex-direction:column;gap:8px;}
.item-line{display:grid;grid-template-columns:1fr 80px 110px 28px;gap:8px;align-items:center;}
.add-item-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px dashed rgba(255,255,255,.12);background:transparent;color:rgba(232,234,237,.4);font-family:'Syne',sans-serif;font-size:13px;cursor:pointer;transition:all .15s;width:100%;justify-content:center;}
.add-item-btn:hover{border-color:rgba(0,212,170,.3);color:#00d4aa;}

.total-preview{background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
.tp-lbl{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);text-transform:uppercase;letter-spacing:.1em;}
.tp-val{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#00d4aa;}

.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;} .btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.12);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.2);}

.overlay{position:fixed;inset:0;z-index:140;}
.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}
.confirm{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;max-width:340px;width:100%;}
.ct{font-size:16px;font-weight:700;color:#e8eaed;margin-bottom:8px;}
.cx{font-size:13px;color:rgba(232,234,237,.5);line-height:1.6;margin-bottom:20px;}
.ca{display:flex;gap:10px;justify-content:flex-end;}

@media(max-width:768px){.pg{padding:14px;gap:14px;}.dp{width:100%;}.fr2{grid-template-columns:1fr;}.item-line{grid-template-columns:1fr 70px 90px 28px;}}
`;

const ITEM_EMPTY = { produto_id: '', quantidade: 1, preco_unitario: 0, desconto_item: 0 };

export default function Pedidos() {
  const [pedidos,  setPedidos]  = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [toast,     setToast]     = useState(null);

  // form novo pedido
  const [form, setForm] = useState({ cliente_id:'', desconto:0, observacao:'', itens:[{ ...ITEM_EMPTY }] });
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ped, prod, cli] = await Promise.allSettled([
        api.get('/pedidos'), api.get('/produtos'), api.get('/clientes'),
      ]);
      if (ped.status  === 'fulfilled') setPedidos(ped.value);
      if (prod.status === 'fulfilled') setProdutos(prod.value);
      if (cli.status  === 'fulfilled') setClientes(cli.value);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = pedidos.filter(p => {
    const ms = !search || p.cliente?.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    const mf = !filtroStatus || p.status === filtroStatus;
    return ms && mf;
  });

  const stats = {
    total:     pedidos.length,
    pendente:  pedidos.filter(p=>p.status==='pendente').length,
    entregue:  pedidos.filter(p=>p.status==='entregue').length,
    cancelado: pedidos.filter(p=>p.status==='cancelado').length,
    receita:   pedidos.filter(p=>p.status!=='cancelado').reduce((a,p)=>a+p.total,0),
  };

  // itens form
  const setItem = (i, k, v) => setForm(f => {
    const itens = [...f.itens];
    itens[i] = { ...itens[i], [k]: v };
    // auto-preenche preço ao selecionar produto
    if (k === 'produto_id') {
      const prod = produtos.find(p => p.id === parseInt(v));
      if (prod) itens[i].preco_unitario = prod.preco_venda;
    }
    return { ...f, itens };
  });
  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, { ...ITEM_EMPTY }] }));
  const rmItem  = i  => setForm(f => ({ ...f, itens: f.itens.filter((_,idx) => idx !== i) }));

  const totalPedido = form.itens.reduce((a,it) => a + (it.quantidade * (parseFloat(it.preco_unitario)||0) - (parseFloat(it.desconto_item)||0)), 0) - (parseFloat(form.desconto)||0);

  const salvar = async () => {
    if (!form.itens.length || !form.itens[0].produto_id) { setFormErr('Adicione ao menos 1 produto.'); return; }
    setSaving(true); setFormErr('');
    try {
      await api.post('/pedidos', {
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        desconto:   parseFloat(form.desconto) || 0,
        observacao: form.observacao || null,
        itens: form.itens.filter(it => it.produto_id).map(it => ({
          produto_id:     parseInt(it.produto_id),
          quantidade:     parseInt(it.quantidade),
          preco_unitario: parseFloat(it.preco_unitario),
          desconto_item:  parseFloat(it.desconto_item) || 0,
        })),
      });
      showToast('Pedido criado!');
      setShowModal(false);
      setForm({ cliente_id:'', desconto:0, observacao:'', itens:[{ ...ITEM_EMPTY }] });
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const atualizarStatus = async (id, status) => {
    try {
      await api.patch(`/pedidos/${id}/status?status=${status}`, {});
      showToast(`Status → ${status}`);
      setSelected(sel => sel ? { ...sel, status } : sel);
      load();
    } catch { showToast('Erro ao atualizar status', '✕'); }
  };

  const cancelar = async (id) => {
    try {
      await api.del(`/pedidos/${id}`);
      showToast('Pedido cancelado, estoque devolvido.', '↩');
      setSelected(null); setConfirm(null); load();
    } catch(e) { showToast(e.message || 'Erro ao cancelar', '✕'); }
  };

  return (
    <>
      <style>{S}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Pedidos</div>
            <div className="pg-sub">{pedidos.length} pedido(s) registrado(s)</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ cliente_id:'', desconto:0, observacao:'', itens:[{...ITEM_EMPTY}] }); setFormErr(''); setShowModal(true); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Pedido
          </button>
        </div>

        {/* Stats */}
        <div className="stats">
          {[
            { label:'Total',    val:stats.total,    color:'#0099ff' },
            { label:'Pendente', val:stats.pendente, color:'#ffd32a' },
            { label:'Entregue', val:stats.entregue, color:'#00d4aa' },
            { label:'Cancelado',val:stats.cancelado,color:'#ff4757' },
            { label:'Receita',  val:fmtBRL(stats.receita), color:'#a855f7', wide:true },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="st-dot" style={{background:s.color}}/>
              <div>
                <div className="st-val" style={{fontSize: s.wide ? 14 : 18}}>{s.val}</div>
                <div className="st-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="filters">
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por cliente ou nº do pedido..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>}
          </div>
          <select className="fsel" value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="tbl-wrap">
          {loading ? (
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:10}}>
              {[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:44}}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◻</div>
              <div>Nenhum pedido encontrado</div>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th><th>Cliente</th><th>Itens</th>
                  <th>Total</th><th>Status</th><th>Data</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const st = STATUS_MAP[p.status] || { cls:'b-gray', label:p.status };
                  return (
                    <tr key={p.id} onClick={()=>setSelected(p)}>
                      <td className="mono">#{p.id}</td>
                      <td>{p.cliente || <span style={{color:'rgba(232,234,237,.3)'}}>—</span>}</td>
                      <td className="mono">{p.num_itens} item(s)</td>
                      <td className="mono" style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(p.total)}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="mono" style={{fontSize:11}}>{p.data}</td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div className="act-btns">
                          {p.status !== 'cancelado' && p.status !== 'entregue' && (
                            <button className="ib success" title="Marcar como entregue" onClick={()=>atualizarStatus(p.id,'entregue')}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                          )}
                          {p.status !== 'cancelado' && (
                            <button className="ib danger" title="Cancelar pedido" onClick={()=>setConfirm(p)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && !showModal && (
        <>
          <div className="overlay" onClick={()=>setSelected(null)}/>
          <div className="dp">
            <div className="dp-head">
              <div>
                <div className="dp-id">Pedido #{selected.id}</div>
                <div className="dp-meta">{selected.data}</div>
                <div style={{marginTop:8}}>
                  <span className={`badge ${(STATUS_MAP[selected.status]||{cls:'b-gray'}).cls}`}>
                    {(STATUS_MAP[selected.status]||{label:selected.status}).label}
                  </span>
                </div>
              </div>
              <button className="mclose" onClick={()=>setSelected(null)}>×</button>
            </div>
            <div className="dp-body">
              <div>
                <div className="dp-sec">Informações</div>
                <div className="dp-grid2">
                  <div><div className="dp-fl">Cliente</div><div className="dp-fv">{selected.cliente||'—'}</div></div>
                  <div><div className="dp-fl">Total</div><div className="dp-fv green mono">{fmtBRL(selected.total)}</div></div>
                  {selected.desconto > 0 && <div><div className="dp-fl">Desconto</div><div className="dp-fv mono">- {fmtBRL(selected.desconto)}</div></div>}
                  {selected.observacao && <div style={{gridColumn:'1/-1'}}><div className="dp-fl">Obs.</div><div className="dp-fv" style={{fontSize:13}}>{selected.observacao}</div></div>}
                </div>
              </div>
              <div>
                <div className="dp-sec">Itens ({selected.itens?.length})</div>
                {selected.itens?.map((it,i) => (
                  <div key={i} className="item-row">
                    <div className="item-nome">{it.produto}</div>
                    <div className="item-qty">{it.quantidade}x</div>
                    <div className="item-val">{fmtBRL(it.subtotal)}</div>
                  </div>
                ))}
              </div>
              {selected.status !== 'cancelado' && (
                <div>
                  <div className="dp-sec">Atualizar Status</div>
                  <select className="status-sel" value={selected.status}
                    onChange={e => atualizarStatus(selected.id, e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              )}
            </div>
            <div className="dp-foot">
              {selected.status !== 'cancelado' && (
                <button className="btn btn-danger" onClick={()=>setConfirm(selected)}>Cancelar Pedido</button>
              )}
              <button className="btn btn-ghost" onClick={()=>setSelected(null)}>Fechar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal Novo Pedido */}
      {showModal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="mhd">
              <div><div className="mtitle">Novo Pedido</div><div className="msub">Adicione produtos e cliente</div></div>
              <button className="mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="fr2">
                <div className="ff full">
                  <label className="fl">Cliente (opcional)</label>
                  <select className="fsel" value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}>
                    <option value="">Sem cliente</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="fl" style={{display:'block',marginBottom:8}}>Produtos *</label>
                <div className="item-list">
                  {form.itens.map((it,i) => (
                    <div key={i} className="item-line">
                      <select className="fsel" value={it.produto_id} onChange={e=>setItem(i,'produto_id',e.target.value)}>
                        <option value="">Selecione...</option>
                        {produtos.map(p=><option key={p.id} value={p.id}>{p.nome} (est: {p.estoque_atual})</option>)}
                      </select>
                      <input className="fi" type="number" min="1" placeholder="Qtd"
                        value={it.quantidade} onChange={e=>setItem(i,'quantidade',e.target.value)}/>
                      <input className="fi" type="number" min="0" step="0.01" placeholder="Preço unit."
                        value={it.preco_unitario} onChange={e=>setItem(i,'preco_unitario',e.target.value)}/>
                      <button className="ib danger" onClick={()=>rmItem(i)} disabled={form.itens.length===1}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  <button className="add-item-btn" onClick={addItem}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Adicionar produto
                  </button>
                </div>
              </div>

              <div className="fr2">
                <div className="ff">
                  <label className="fl">Desconto geral (R$)</label>
                  <input className="fi" type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.desconto} onChange={e=>setForm(f=>({...f,desconto:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">Observação</label>
                  <input className="fi" placeholder="Opcional..."
                    value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
                </div>
              </div>

              <div className="total-preview">
                <div><div className="tp-lbl">Total do pedido</div></div>
                <div className="tp-val">{fmtBRL(totalPedido)}</div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel */}
      {confirm && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div className="confirm">
            <div className="ct">Cancelar pedido #{confirm.id}?</div>
            <div className="cx">O estoque dos produtos será devolvido automaticamente. Essa ação não pode ser desfeita.</div>
            <div className="ca">
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Voltar</button>
              <button className="btn btn-danger" onClick={()=>cancelar(confirm.id)}>Cancelar Pedido</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}