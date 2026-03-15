import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const PAGAMENTOS = ['Dinheiro','Cartão de crédito','Cartão de débito','PIX','Boleto','Fiado'];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.stats{display:flex;gap:12px;flex-wrap:wrap;}
.stat{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px;}
.st-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.st-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.st-lbl{font-size:11px;color:rgba(232,234,237,.35);margin-top:1px;}
.tbl-wrap{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl td{padding:13px 16px;font-size:13px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-blue{background:rgba(0,153,255,.12);color:#0099ff;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}
.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(0,212,170,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#0e1013;z-index:2;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;}
.mclose:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.mbody{padding:20px 24px;display:flex;flex-direction:column;gap:16px;}
.mfoot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:#0e1013;z-index:2;}
.sec{display:flex;flex-direction:column;gap:10px;}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.05);}
.fr2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fr3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.ff{display:flex;flex-direction:column;gap:5px;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi,.fsel2{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 12px;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus,.fsel2:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.fsel2 option{background:#0e1013;}
.fi:disabled{opacity:.4;cursor:not-allowed;}

/* Itens */
.itens-list{display:flex;flex-direction:column;gap:8px;}
.item-row{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;}
.item-nome{font-size:13px;font-weight:600;color:#e8eaed;}
.item-sub{font-size:10px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.item-input{background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:6px 8px;font-size:12px;color:#e8eaed;font-family:'JetBrains Mono',monospace;outline:none;width:70px;text-align:right;}
.item-input:focus{border-color:rgba(0,212,170,.4);}
.item-total{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa;min-width:80px;text-align:right;}
.item-del{background:none;border:none;color:rgba(255,71,87,.5);cursor:pointer;font-size:16px;padding:2px 4px;transition:color .15s;}
.item-del:hover{color:#ff4757;}

.add-item-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;}
.btn-add-item{background:rgba(0,212,170,.08);border:1px solid rgba(0,212,170,.2);border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;color:#00d4aa;cursor:pointer;white-space:nowrap;transition:all .15s;font-family:'Syne',sans-serif;}
.btn-add-item:hover{background:rgba(0,212,170,.15);}
.btn-add-item:disabled{opacity:.4;cursor:not-allowed;}

/* Total box */
.total-box{background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.total-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;}
.total-row.main{font-size:17px;font-weight:800;border-top:1px solid rgba(0,212,170,.15);padding-top:8px;margin-top:2px;}
.total-label{color:rgba(232,234,237,.5);}
.total-val{font-family:'JetBrains Mono',monospace;color:#e8eaed;}
.total-val.green{color:#00d4aa;}

.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}
.finfo{background:rgba(255,211,42,.07);border:1px solid rgba(255,211,42,.2);border-radius:8px;padding:8px 12px;font-size:11px;color:#ffd32a;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}
@media(max-width:768px){.pg{padding:14px;gap:14px;}.fr2,.fr3{grid-template-columns:1fr;}.item-row{grid-template-columns:1fr auto auto;}.item-total{display:none;}}
`;

const FORM_EMPTY = {
  cliente_id: '', modo_pagamento: 'PIX', parcelado: false,
  num_parcelas: 2, data_vencimento: '', desconto_geral: '', observacao: '',
};

const pag_badge = {
  'Dinheiro': 'b-green', 'PIX': 'b-green', 'Cartão de débito': 'b-blue',
  'Cartão de crédito': 'b-blue', 'Boleto': 'b-yellow', 'Fiado': 'b-red',
};

export default function Vendas() {
  const [pedidos,  setPedidos]  = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showModal,setShowModal]= useState(false);
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [itens,    setItens]    = useState([]);
  const [prodAdd,  setProdAdd]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ped, cli, prod] = await Promise.allSettled([
        api.get('/pedidos?status=concluido&limite=100'),
        api.get('/clientes'),
        api.get('/produtos'),
      ]);
      if (ped.status  === 'fulfilled') setPedidos(ped.value);
      if (cli.status  === 'fulfilled') setClientes(cli.value);
      if (prod.status === 'fulfilled') setProdutos(prod.value.filter(p => p.ativo && p.estoque_atual > 0));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Itens ──────────────────────────────────────────────────────
  const addItem = () => {
    const prod = produtos.find(p => p.id === parseInt(prodAdd));
    if (!prod) return;
    if (itens.find(i => i.produto_id === prod.id)) {
      setItens(prev => prev.map(i => i.produto_id === prod.id ? {...i, quantidade: i.quantidade+1} : i));
    } else {
      setItens(prev => [...prev, { produto_id: prod.id, nome: prod.nome, unidade: prod.unidade,
        estoque: prod.estoque_atual, preco_unitario: prod.preco_venda, quantidade: 1, desconto_item: 0 }]);
    }
    setProdAdd('');
  };

  const updItem = (id, field, val) => setItens(prev => prev.map(i => i.produto_id===id ? {...i,[field]:val} : i));
  const delItem = (id) => setItens(prev => prev.filter(i => i.produto_id !== id));

  // ── Totais ─────────────────────────────────────────────────────
  const subtotal      = itens.reduce((a,i) => a + i.quantidade * i.preco_unitario - (parseFloat(i.desconto_item)||0), 0);
  const descontoGeral = parseFloat(form.desconto_geral) || 0;
  const total         = Math.max(0, subtotal - descontoGeral);

  // ── Validação ──────────────────────────────────────────────────
  const fiado        = form.modo_pagamento === 'Fiado';
  const precisaParcela = form.parcelado || form.modo_pagamento === 'Boleto' || fiado;

  // ── Salvar ─────────────────────────────────────────────────────
  const salvar = async () => {
    if (itens.length === 0)            { setFormErr('Adicione ao menos 1 produto.'); return; }
    if (fiado && !form.cliente_id)     { setFormErr('Venda fiado exige cliente cadastrado.'); return; }
    if (precisaParcela && !form.data_vencimento) { setFormErr('Informe a data de vencimento.'); return; }
    for (const it of itens) {
      if (it.quantidade < 1)           { setFormErr(`Quantidade inválida para ${it.nome}.`); return; }
      if (it.quantidade > it.estoque)  { setFormErr(`Estoque insuficiente para ${it.nome} (disponível: ${it.estoque}).`); return; }
    }
    setSaving(true); setFormErr('');
    try {
      const res = await api.post('/vendas/unificada', {
        cliente_id:      form.cliente_id ? parseInt(form.cliente_id) : null,
        itens:           itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade,
                           preco_unitario: parseFloat(i.preco_unitario), desconto_item: parseFloat(i.desconto_item)||0 })),
        modo_pagamento:  form.modo_pagamento,
        parcelado:       form.parcelado,
        num_parcelas:    parseInt(form.num_parcelas) || 1,
        data_vencimento: form.data_vencimento || null,
        desconto_geral:  descontoGeral,
        observacao:      form.observacao || null,
      });
      showToast(`Venda #${res.pedido_id} registrada! Total: ${fmtBRL(res.total)}`, '✓');
      setShowModal(false);
      setForm(FORM_EMPTY);
      setItens([]);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const openModal = () => { setForm(FORM_EMPTY); setItens([]); setProdAdd(''); setFormErr(''); setShowModal(true); };

  const filtered = pedidos.filter(p =>
    !search || (p.cliente||'').toLowerCase().includes(search.toLowerCase())
  );

  const totalVendas = pedidos.reduce((a,p) => a+p.total, 0);

  return (
    <>
      <style>{S}</style>
      <div className="pg">
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Vendas</div>
            <div className="pg-sub">{pedidos.length} venda(s) concluída(s)</div>
          </div>
          <button className="btn btn-primary" onClick={openModal}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Venda
          </button>
        </div>

        <div className="stats">
          {[
            { label:'Vendas',       val: pedidos.length,      color:'#00d4aa' },
            { label:'Faturamento',  val: fmtBRL(totalVendas), color:'#a855f7', small:true },
            { label:'Ticket médio', val: fmtBRL(pedidos.length ? totalVendas/pedidos.length : 0), color:'#0099ff', small:true },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="st-dot" style={{background:s.color}}/>
              <div>
                <div className="st-val" style={{fontSize:s.small?13:18}}>{s.val}</div>
                <div className="st-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10}}>
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16}}>×</button>}
          </div>
        </div>

        <div className="tbl-wrap">
          {loading ? (
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:10}}>
              {[1,2,3,4].map(i=><div key={i} className="skel" style={{height:44}}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◈</div>
              <div>Nenhuma venda registrada</div>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>#</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Data</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="mono" style={{fontSize:11,color:'rgba(232,234,237,.3)'}}>#{p.id}</td>
                    <td>{p.cliente || <span style={{color:'rgba(232,234,237,.3)'}}>Balcão</span>}</td>
                    <td className="mono" style={{fontSize:11}}>{p.num_itens} item(s)</td>
                    <td>—</td>
                    <td className="mono" style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(p.total)}</td>
                    <td className="mono" style={{fontSize:11}}>{p.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Nova Venda */}
      {showModal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="mhd">
              <div><div className="mtitle">Nova Venda</div><div className="msub">Registra venda, baixa estoque e financeiro</div></div>
              <button className="mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}

              {/* Cliente */}
              <div className="sec">
                <div className="sec-title">Cliente</div>
                <div className="ff">
                  <label className="fl">Cliente <span style={{color:'rgba(232,234,237,.25)'}}>— opcional (balcão)</span></label>
                  <select className="fsel2" value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}>
                    <option value="">Balcão (sem cadastro)</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{c.telefone?` — ${c.telefone}`:''}</option>)}
                  </select>
                </div>
              </div>

              {/* Produtos */}
              <div className="sec">
                <div className="sec-title">Produtos</div>
                <div className="add-item-row">
                  <select className="fsel2" value={prodAdd} onChange={e=>setProdAdd(e.target.value)}>
                    <option value="">Selecione um produto...</option>
                    {produtos.filter(p => !itens.find(i=>i.produto_id===p.id)).map(p=>(
                      <option key={p.id} value={p.id}>{p.nome} — {fmtBRL(p.preco_venda)} (estoque: {p.estoque_atual})</option>
                    ))}
                  </select>
                  <button className="btn-add-item" onClick={addItem} disabled={!prodAdd}>+ Adicionar</button>
                </div>

                {itens.length > 0 && (
                  <div className="itens-list">
                    {itens.map(it => (
                      <div key={it.produto_id} className="item-row">
                        <div>
                          <div className="item-nome">{it.nome}</div>
                          <div className="item-sub">estoque: {it.estoque} {it.unidade}</div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end'}}>
                          <span className="fl" style={{fontSize:9}}>Qtd</span>
                          <input className="item-input" type="number" min="1" max={it.estoque}
                            value={it.quantidade} onChange={e=>updItem(it.produto_id,'quantidade',parseInt(e.target.value)||1)}/>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end'}}>
                          <span className="fl" style={{fontSize:9}}>Preço</span>
                          <input className="item-input" type="number" min="0" step="0.01"
                            value={it.preco_unitario} onChange={e=>updItem(it.produto_id,'preco_unitario',e.target.value)}/>
                        </div>
                        <div className="item-total">{fmtBRL(it.quantidade * it.preco_unitario - (parseFloat(it.desconto_item)||0))}</div>
                        <button className="item-del" onClick={()=>delItem(it.produto_id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {itens.length === 0 && (
                  <div style={{padding:'16px',textAlign:'center',color:'rgba(232,234,237,.2)',fontSize:12,fontFamily:'JetBrains Mono,monospace'}}>
                    Nenhum produto adicionado
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div className="sec">
                <div className="sec-title">Pagamento</div>
                <div className="fr2">
                  <div className="ff">
                    <label className="fl">Forma de pagamento</label>
                    <select className="fsel2" value={form.modo_pagamento} onChange={e=>setForm(f=>({...f,modo_pagamento:e.target.value,parcelado:false}))}>
                      {PAGAMENTOS.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">Desconto geral (R$)</label>
                    <input className="fi" type="number" min="0" step="0.01" placeholder="0,00"
                      value={form.desconto_geral} onChange={e=>setForm(f=>({...f,desconto_geral:e.target.value}))}/>
                  </div>
                </div>

                {/* Parcelamento — só para crédito */}
                {form.modo_pagamento === 'Cartão de crédito' && (
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(232,234,237,.6)',cursor:'pointer'}}>
                      <input type="checkbox" checked={form.parcelado} onChange={e=>setForm(f=>({...f,parcelado:e.target.checked}))}
                        style={{accentColor:'#00d4aa',width:14,height:14}}/>
                      Parcelado
                    </label>
                    {form.parcelado && (
                      <div className="ff" style={{flex:1}}>
                        <input className="fi" type="number" min="2" max="24" placeholder="Nº parcelas"
                          value={form.num_parcelas} onChange={e=>setForm(f=>({...f,num_parcelas:e.target.value}))}/>
                      </div>
                    )}
                  </div>
                )}

                {/* Vencimento — fiado/boleto/parcelado */}
                {precisaParcela && (
                  <div className="ff">
                    <label className="fl">
                      {fiado ? 'Vencimento do fiado' : form.parcelado ? 'Vencimento da 1ª parcela' : 'Data de vencimento'}
                    </label>
                    <input className="fi" type="date" value={form.data_vencimento}
                      onChange={e=>setForm(f=>({...f,data_vencimento:e.target.value}))}/>
                  </div>
                )}

                {fiado && !form.cliente_id && (
                  <div className="finfo">⚠ Venda fiado exige cliente cadastrado — selecione um cliente acima</div>
                )}
              </div>

              {/* Observação */}
              <div className="ff">
                <label className="fl">Observação</label>
                <input className="fi" type="text" placeholder="Opcional..."
                  value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
              </div>

              {/* Total */}
              {itens.length > 0 && (
                <div className="total-box">
                  <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-val">{fmtBRL(subtotal)}</span>
                  </div>
                  {descontoGeral > 0 && (
                    <div className="total-row">
                      <span className="total-label">Desconto</span>
                      <span className="total-val" style={{color:'#ff6b35'}}>- {fmtBRL(descontoGeral)}</span>
                    </div>
                  )}
                  <div className="total-row main">
                    <span className="total-label">Total</span>
                    <span className="total-val green">{fmtBRL(total)}</span>
                  </div>
                  {form.parcelado && form.num_parcelas > 1 && (
                    <div style={{fontSize:11,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>
                      {form.num_parcelas}x de {fmtBRL(total / parseInt(form.num_parcelas||1))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving||itens.length===0}>
                {saving ? 'Registrando...' : `Confirmar Venda${total>0?' — '+fmtBRL(total):''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}