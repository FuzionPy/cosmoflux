import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',  headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:  (url,b) => fetch(BASE+url,{method:'PUT',   headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:  url     => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
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

.stats{display:flex;gap:12px;flex-wrap:wrap;}
.stat{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px;}
.st-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.st-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.st-lbl{font-size:11px;color:rgba(232,234,237,.35);margin-top:1px;}

.filters{display:flex;gap:10px;flex-wrap:wrap;}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(0,212,170,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}

/* GRID DE CARDS */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c,#00d4aa);}
.card:hover{border-color:rgba(255,255,255,.12);transform:translateY(-2px);}
.card-nome{font-size:15px;font-weight:800;color:#e8eaed;margin-bottom:4px;}
.card-contato{font-size:12px;color:rgba(232,234,237,.4);margin-bottom:12px;}
.card-info{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ci-row{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(232,234,237,.5);}
.ci-icon{font-size:13px;width:16px;text-align:center;flex-shrink:0;}
.card-footer{display:flex;align-items:center;justify-content:space-between;}
.cf-badge{font-size:10px;font-family:'JetBrains Mono',monospace;background:rgba(0,212,170,.1);color:#00d4aa;padding:3px 8px;border-radius:4px;}
.act-btns{display:flex;gap:6px;}
.ib{width:28px;height:28px;border-radius:6px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.04);color:rgba(232,234,237,.4);}
.ib:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.ib.danger:hover{background:rgba(255,71,87,.15);color:#ff4757;}

.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

/* DETAIL PANEL */
.dp{position:fixed;right:0;top:0;bottom:0;width:420px;background:#0e1013;border-left:1px solid rgba(255,255,255,.08);z-index:150;overflow-y:auto;display:flex;flex-direction:column;animation:dpIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes dpIn{from{transform:translateX(100%)}to{transform:none}}
.dp::-webkit-scrollbar{width:4px}.dp::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
.dp-head{padding:22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;}
.dp-nome{font-size:20px;font-weight:800;}
.dp-body{padding:20px 22px;flex:1;display:flex;flex-direction:column;gap:20px;}
.dp-sec{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.dp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.dp-fl{font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:3px;}
.dp-fv{font-size:13px;font-weight:600;color:#e8eaed;}
.dp-foot{padding:14px 22px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;flex-shrink:0;}
.overlay{position:fixed;inset:0;z-index:140;}

/* TABELA PRODUTOS DO FORNECEDOR */
.mini-tbl{width:100%;border-collapse:collapse;}
.mini-tbl th{text-align:left;padding:7px 10px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.25);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.05);}
.mini-tbl td{padding:9px 10px;font-size:12px;color:rgba(232,234,237,.5);border-bottom:1px solid rgba(255,255,255,.03);}
.mini-tbl tr:last-child td{border-bottom:none;}
.mini-tbl td:first-child{color:#e8eaed;font-weight:600;}
.mini-tbl td.mono{font-family:'JetBrains Mono',monospace;}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.mclose:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.mbody{padding:20px 24px;display:flex;flex-direction:column;gap:14px;}
.mfoot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;justify-content:flex-end;}
.ff{display:flex;flex-direction:column;gap:5px;}
.fr2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.12);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.2);}

.confirm{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;max-width:340px;width:100%;}
.ct{font-size:16px;font-weight:700;color:#e8eaed;margin-bottom:8px;}
.cx{font-size:13px;color:rgba(232,234,237,.5);line-height:1.6;margin-bottom:20px;}
.ca{display:flex;gap:10px;justify-content:flex-end;}
.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}
@media(max-width:768px){.pg{padding:14px;}.dp{width:100%;}.grid{grid-template-columns:1fr;}.fr2{grid-template-columns:1fr;}}
`;

const FORM_EMPTY = { nome:'', contato:'', email:'', telefone:'' };
const CORES = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757'];

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [prodsForn, setProdsForn] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(FORM_EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [confirm,   setConfirm]   = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/fornecedores');
      setFornecedores(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const abrirDetalhe = async (f) => {
    setSelected(f);
    setProdsForn([]);
    try {
      const prods = await api.get(`/fornecedores/${f.id}/produtos`);
      setProdsForn(prods);
    } catch {}
  };

  const filtered = fornecedores.filter(f =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.email||'').toLowerCase().includes(search.toLowerCase()) ||
    (f.telefone||'').includes(search)
  );

  const abrirModal = (f = null) => {
    setEditando(f);
    setForm(f ? { nome:f.nome, contato:f.contato||'', email:f.email||'', telefone:f.telefone||'' } : FORM_EMPTY);
    setFormErr('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome) { setFormErr('Nome é obrigatório.'); return; }
    setSaving(true); setFormErr('');
    try {
      if (editando) {
        await api.put(`/fornecedores/${editando.id}`, form);
        showToast('Fornecedor atualizado!');
      } else {
        await api.post('/fornecedores', form);
        showToast('Fornecedor criado!');
      }
      setShowModal(false);
      setSelected(null);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const deletar = async (id) => {
    try {
      await api.del(`/fornecedores/${id}`);
      showToast('Fornecedor removido.', '🗑');
      setSelected(null); setConfirm(null); load();
    } catch(e) { showToast(e.message||'Erro', '✕'); }
  };

  const totalProdutos = fornecedores.reduce((a,f) => a + (f.num_produtos||0), 0);

  return (
    <>
      <style>{S}</style>
      <div className="pg">
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Fornecedores</div>
            <div className="pg-sub">{fornecedores.length} fornecedor(es) cadastrado(s)</div>
          </div>
          <button className="btn btn-primary" onClick={() => abrirModal()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Fornecedor
          </button>
        </div>

        <div className="stats">
          {[
            { label:'Total',    val: fornecedores.length,                             color:'#00d4aa' },
            { label:'Ativos',   val: fornecedores.filter(f=>f.ativo!==false).length,  color:'#0099ff' },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="st-dot" style={{background:s.color}}/>
              <div><div className="st-val">{s.val}</div><div className="st-lbl">{s.label}</div></div>
            </div>
          ))}
        </div>

        <div className="filters">
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16}}>×</button>}
          </div>
        </div>

        {loading ? (
          <div className="grid">
            {[1,2,3,4].map(i=><div key={i} className="skel" style={{height:160}}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◎</div>
            <div>Nenhum fornecedor encontrado</div>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((f, i) => (
              <div key={f.id} className="card" style={{'--c': CORES[i % CORES.length]}}
                onClick={() => abrirDetalhe(f)}>
                <div className="card-nome">{f.nome}</div>
                <div className="card-contato">{f.contato || 'Sem contato'}</div>
                <div className="card-info">
                  {f.telefone && <div className="ci-row"><span className="ci-icon">📞</span>{f.telefone}</div>}
                  {f.email    && <div className="ci-row"><span className="ci-icon">✉</span>{f.email}</div>}
                  {!f.telefone && !f.email && <div className="ci-row" style={{color:'rgba(232,234,237,.2)'}}>Sem informações de contato</div>}
                </div>
                <div className="card-footer" onClick={e=>e.stopPropagation()}>
                  <span className="cf-badge">fornecedor</span>
                  <div className="act-btns">
                    <button className="ib" title="Editar" onClick={e=>{e.stopPropagation();abrirModal(f);}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ib danger" title="Remover" onClick={e=>{e.stopPropagation();setConfirm(f);}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && !showModal && (
        <>
          <div className="overlay" onClick={()=>setSelected(null)}/>
          <div className="dp">
            <div className="dp-head">
              <div>
                <div className="dp-nome">{selected.nome}</div>
                <div style={{fontSize:12,color:'rgba(232,234,237,.3)',marginTop:4}}>{selected.contato||'Sem contato'}</div>
              </div>
              <button className="mclose" onClick={()=>setSelected(null)}>×</button>
            </div>
            <div className="dp-body">
              <div>
                <div className="dp-sec">Contato</div>
                <div className="dp-grid2">
                  <div><div className="dp-fl">Telefone</div><div className="dp-fv">{selected.telefone||'—'}</div></div>
                  <div><div className="dp-fl">Email</div><div className="dp-fv" style={{fontSize:12,wordBreak:'break-all'}}>{selected.email||'—'}</div></div>
                </div>
              </div>
              <div>
                <div className="dp-sec">Produtos fornecidos ({prodsForn.length})</div>
                {prodsForn.length === 0 ? (
                  <div style={{fontSize:12,color:'rgba(232,234,237,.25)',fontFamily:'JetBrains Mono, monospace'}}>Nenhum produto vinculado</div>
                ) : (
                  <table className="mini-tbl">
                    <thead><tr><th>Produto</th><th>Estoque</th><th>Preço</th></tr></thead>
                    <tbody>
                      {prodsForn.map(p => (
                        <tr key={p.id}>
                          <td>{p.nome}{p.sku&&<div style={{fontSize:10,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace'}}>{p.sku}</div>}</td>
                          <td className="mono" style={{color: p.status==='esgotado'?'#ff4757':p.status==='critico'?'#ff6b35':'#00d4aa'}}>
                            {p.estoque_atual} {p.unidade}
                          </td>
                          <td className="mono" style={{color:'#00d4aa'}}>{fmtBRL(p.preco_venda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="dp-foot">
              <button className="btn btn-primary" onClick={()=>abrirModal(selected)}>Editar</button>
              <button className="btn btn-danger" onClick={()=>setConfirm(selected)}>Remover</button>
              <button className="btn btn-ghost" onClick={()=>setSelected(null)}>Fechar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="mhd">
              <div>
                <div className="mtitle">{editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}</div>
                <div className="msub">Dados de contato e identificação</div>
              </div>
              <button className="mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="ff">
                <label className="fl">Nome *</label>
                <input className="fi" placeholder="Nome da empresa ou pessoa" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
              </div>
              <div className="ff">
                <label className="fl">Contato (pessoa)</label>
                <input className="fi" placeholder="Nome do responsável" value={form.contato} onChange={e=>setForm(f=>({...f,contato:e.target.value}))}/>
              </div>
              <div className="fr2">
                <div className="ff">
                  <label className="fl">Telefone</label>
                  <input className="fi" placeholder="(00) 00000-0000" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">Email</label>
                  <input className="fi" type="email" placeholder="email@empresa.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : editando ? 'Salvar' : 'Criar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirm && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div className="confirm">
            <div className="ct">Remover {confirm.nome}?</div>
            <div className="cx">O fornecedor será desativado. Os produtos vinculados a ele não serão afetados.</div>
            <div className="ca">
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={()=>deletar(confirm.id)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}