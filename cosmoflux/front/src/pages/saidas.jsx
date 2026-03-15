import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const MOTIVOS_SAIDA = ['Venda direta','Uso interno','Perda/Vencimento','Brinde','Devolução a fornecedor','Ajuste de inventário','Outros'];

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

.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(255,107,53,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}
.fsel{background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;font-size:13px;color:rgba(232,234,237,.7);font-family:'Syne',sans-serif;outline:none;cursor:pointer;}

.tbl-wrap{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl td{padding:13px 16px;font-size:13px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;}
.qty-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;background:rgba(255,107,53,.12);color:#ff6b35;}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.b-orange{background:rgba(255,107,53,.12);color:#ff6b35;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}

.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}

.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
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
.fi,.fsel2,.fta{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus,.fsel2:focus,.fta:focus{border-color:rgba(255,107,53,.4);box-shadow:0 0 0 3px rgba(255,107,53,.08);}
.fsel2 option{background:#0e1013;}
.fta{resize:vertical;min-height:70px;}

.preview-box{border-radius:8px;padding:12px 16px;}
.preview-box.ok     {background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);}
.preview-box.warn   {background:rgba(255,211,42,.05);border:1px solid rgba(255,211,42,.2);}
.preview-box.danger {background:rgba(255,71,87,.05);border:1px solid rgba(255,71,87,.2);}
.pb-label{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.pb-val{font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.pb-ok     .pb-val{color:#00d4aa;}
.pb-warn   .pb-val{color:#ffd32a;}
.pb-danger .pb-val{color:#ff4757;}

.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-saida{background:#ff6b35;color:#fff;} .btn-saida:hover{background:#ff8555;transform:translateY(-1px);}
.btn-saida:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}

.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}

@media(max-width:768px){.pg{padding:14px;gap:14px;}.fr2{grid-template-columns:1fr;}}
`;

const FORM_EMPTY = { produto_id:'', quantidade:'', motivo:'Venda direta', observacao:'' };

export default function Saidas() {
  const [movs,     setMovs]     = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showModal,setShowModal]= useState(false);
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [toast,    setToast]    = useState(null);

  const showToast = (msg,icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.allSettled([
        api.get('/movimentacoes?tipo=saida&limite=100'),
        api.get('/produtos'),
      ]);
      if (m.status === 'fulfilled') setMovs(m.value);
      if (p.status === 'fulfilled') setProdutos(p.value);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = movs.filter(m =>
    !search || m.produto?.toLowerCase().includes(search.toLowerCase()) ||
    (m.motivo||'').toLowerCase().includes(search.toLowerCase())
  );

  const totalUnidades = movs.reduce((a, m) => a + m.quantidade, 0);
  const totalValor    = movs.reduce((a, m) => {
    const prod = produtos.find(p => p.id === m.produto_id);
    return a + (m.quantidade * (prod?.preco_venda || 0));
  }, 0);

  const prodSelecionado = produtos.find(p => p.id === parseInt(form.produto_id));
  const qtd = parseInt(form.quantidade) || 0;
  const estoqueApos = prodSelecionado ? prodSelecionado.estoque_atual - qtd : null;
  const previewClass = estoqueApos === null ? '' : estoqueApos < 0 ? 'danger' : estoqueApos <= (prodSelecionado?.estoque_minimo||0) ? 'warn' : 'ok';

  const salvar = async () => {
    if (!form.produto_id || !form.quantidade) { setFormErr('Produto e quantidade são obrigatórios.'); return; }
    if (prodSelecionado && qtd > prodSelecionado.estoque_atual) {
      setFormErr(`Estoque insuficiente. Disponível: ${prodSelecionado.estoque_atual} ${prodSelecionado.unidade}`); return;
    }
    setSaving(true); setFormErr('');
    try {
      const res = await api.post('/movimentacoes', {
        produto_id: parseInt(form.produto_id),
        tipo: 'saida',
        quantidade: qtd,
        motivo: form.motivo || null,
        observacao: form.observacao || null,
      });
      showToast(`Saída registrada! Novo estoque: ${res.estoque_novo}`, '↓');
      setShowModal(false);
      setForm(FORM_EMPTY);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <style>{S}</style>
      <div className="pg">

        <div className="pg-hdr">
          <div>
            <div className="pg-title">Saídas de Estoque</div>
            <div className="pg-sub">{movs.length} saída(s) registrada(s)</div>
          </div>
          <button className="btn btn-saida" onClick={() => { setForm(FORM_EMPTY); setFormErr(''); setShowModal(true); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Registrar Saída
          </button>
        </div>

        <div className="stats">
          {[
            { label:'Registros',   val:movs.length,        color:'#ff6b35' },
            { label:'Total unid.', val:totalUnidades,       color:'#ff4757' },
            { label:'Valor saído', val:fmtBRL(totalValor), color:'#a855f7', small:true },
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

        <div className="filters">
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por produto ou motivo..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>}
          </div>
        </div>

        <div className="tbl-wrap">
          {loading ? (
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:10}}>
              {[1,2,3,4].map(i=><div key={i} className="skel" style={{height:44}}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">↓</div>
              <div>Nenhuma saída registrada</div>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Produto</th><th>Qtd. Saída</th><th>Motivo</th><th>Usuário</th><th>Data</th><th>Obs.</th></tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td>{m.produto}</td>
                    <td><span className="qty-badge">↓ -{m.quantidade}</span></td>
                    <td>
                      {m.motivo === 'venda'
                        ? <span className="badge b-orange">VENDA</span>
                        : m.motivo === 'cancelamento'
                        ? <span className="badge b-gray">CANCELAMENTO</span>
                        : m.motivo || '—'}
                    </td>
                    <td className="mono" style={{fontSize:11}}>{m.usuario || '—'}</td>
                    <td className="mono" style={{fontSize:11}}>{m.data}</td>
                    <td style={{fontSize:11,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="mhd">
              <div><div className="mtitle">Registrar Saída</div><div className="msub">Saída manual de produtos do estoque</div></div>
              <button className="mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}

              <div className="ff">
                <label className="fl">Produto *</label>
                <select className="fsel2" value={form.produto_id} onChange={e=>setForm(f=>({...f,produto_id:e.target.value}))}>
                  <option value="">Selecione um produto...</option>
                  {produtos.map(p=>(
                    <option key={p.id} value={p.id} disabled={p.estoque_atual===0}>
                      {p.nome} — estoque: {p.estoque_atual} {p.unidade}{p.estoque_atual===0?' (ESGOTADO)':''}
                    </option>
                  ))}
                </select>
              </div>

              {prodSelecionado && (
                <div className={`preview-box ${previewClass}`}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <div className="pb-label">Estoque atual</div>
                      <div className="pb-val" style={{color:'#e8eaed'}}>{prodSelecionado.estoque_atual} {prodSelecionado.unidade}</div>
                    </div>
                    {qtd > 0 && (
                      <div className={`pb-${previewClass}`}>
                        <div className="pb-label">Após saída</div>
                        <div className="pb-val">{estoqueApos} {prodSelecionado.unidade}</div>
                      </div>
                    )}
                  </div>
                  {estoqueApos !== null && estoqueApos <= prodSelecionado.estoque_minimo && estoqueApos >= 0 && (
                    <div style={{marginTop:8,fontSize:11,color:'#ffd32a',fontFamily:'JetBrains Mono, monospace'}}>
                      ⚠ Estoque ficará abaixo do mínimo ({prodSelecionado.estoque_minimo})
                    </div>
                  )}
                  {estoqueApos !== null && estoqueApos < 0 && (
                    <div style={{marginTop:8,fontSize:11,color:'#ff4757',fontFamily:'JetBrains Mono, monospace'}}>
                      ✕ Quantidade maior que o estoque disponível
                    </div>
                  )}
                </div>
              )}

              <div className="fr2">
                <div className="ff">
                  <label className="fl">Quantidade *</label>
                  <input className="fi" type="number" min="1"
                    max={prodSelecionado?.estoque_atual || undefined}
                    placeholder="0" value={form.quantidade}
                    onChange={e=>setForm(f=>({...f,quantidade:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">Motivo</label>
                  <select className="fsel2" value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))}>
                    {MOTIVOS_SAIDA.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="ff">
                <label className="fl">Observação</label>
                <textarea className="fta" placeholder="Destino, cliente, justificativa..."
                  value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-saida" onClick={salvar} disabled={saving || (estoqueApos !== null && estoqueApos < 0)}>
                {saving ? 'Salvando...' : 'Registrar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}