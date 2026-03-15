import { useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const isAdmin = () => (localStorage.getItem('admin') || sessionStorage.getItem('admin')) === 'true';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post: (url,b) => fetch(BASE+url,{method:'POST',  headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:  (url,b) => fetch(BASE+url,{method:'PUT',   headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:  url     => fetch(BASE+url,{method:'DELETE',headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Syne',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}

.denied{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;gap:16px;}
.denied-icon{font-size:48px;opacity:.3;}
.denied-title{font-size:18px;font-weight:800;color:rgba(232,234,237,.5);}
.denied-sub{font-size:13px;color:rgba(232,234,237,.25);font-family:'JetBrains Mono',monospace;}

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

.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.tbl-wrap{overflow:auto;}
.tbl{width:100%;border-collapse:collapse;min-width:520px;}
.tbl th{text-align:left;padding:11px 16px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,.06);}
.tbl td{padding:13px 16px;font-size:13px;color:rgba(232,234,237,.6);border-bottom:1px solid rgba(255,255,255,.03);}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.tbl td:first-child{color:#e8eaed;font-weight:600;}
.tbl td.mono{font-family:'JetBrains Mono',monospace;font-size:12px;}

.badge{display:inline-flex;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.05em;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-purple{background:rgba(168,85,247,.12);color:#a855f7;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.4);}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}

.act-btns{display:flex;gap:6px;}
.ib{width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.05);color:rgba(232,234,237,.65);}
.ib:hover{background:rgba(255,255,255,.1);color:#e8eaed;border-color:rgba(255,255,255,.15);}
.ib.danger{color:#ff4757;background:rgba(255,71,87,.08);border-color:rgba(255,71,87,.2);}
.ib.danger:hover{background:rgba(255,71,87,.2);border-color:rgba(255,71,87,.35);}
.ib.warning{color:#ffd32a;background:rgba(255,211,42,.08);border-color:rgba(255,211,42,.2);}
.ib.warning:hover{background:rgba(255,211,42,.2);border-color:rgba(255,211,42,.35);}

.empty{padding:50px;text-align:center;color:rgba(232,234,237,.25);font-size:12px;font-family:'JetBrains Mono',monospace;}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:460px;overflow:hidden;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:flex-start;justify-content:space-between;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.3);font-family:'JetBrains Mono',monospace;margin-top:3px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
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
.fsuc{background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#00d4aa;font-family:'JetBrains Mono',monospace;}
.ftoggle{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;cursor:pointer;transition:border-color .2s;}
.ftoggle:hover{border-color:rgba(255,255,255,.15);}
.toggle-lbl{flex:1;font-size:13px;color:#e8eaed;}
.toggle-sub{font-size:11px;color:rgba(232,234,237,.3);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.toggle-sw{width:36px;height:20px;border-radius:10px;background:rgba(255,255,255,.08);position:relative;transition:background .2s;flex-shrink:0;}
.toggle-sw.on{background:#00d4aa;}
.toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;}
.toggle-sw.on .toggle-knob{transform:translateX(16px);}

.confirm{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;max-width:360px;width:100%;}
.ct{font-size:16px;font-weight:700;color:#e8eaed;margin-bottom:8px;}
.cx{font-size:13px;color:rgba(232,234,237,.5);line-height:1.6;margin-bottom:20px;}
.ca{display:flex;gap:10px;justify-content:flex-end;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.12);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.2);}

.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);}
.avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}

.tenant-sel{display:flex;flex-direction:column;gap:6px;}
.tenant-opt{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;cursor:pointer;transition:all .2s;font-size:13px;color:rgba(232,234,237,.6);}
.tenant-opt.selected,.tenant-opt:hover{border-color:rgba(0,212,170,.4);color:#e8eaed;}
.tenant-opt.selected{background:rgba(0,212,170,.06);}
.to-dot{width:8px;height:8px;border-radius:50%;background:#00d4aa;opacity:0;flex-shrink:0;}
.tenant-opt.selected .to-dot{opacity:1;}

@media(max-width:768px){.pg{padding:14px;}.fr2{grid-template-columns:1fr;}}
`;

const FORM_EMPTY = { nome:'', email:'', senha:'', confirmar_senha:'', admin:false, tenant_id:null, novo_tenant:'' };
const AVATARES   = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757'];
const avatarCor  = (nome='') => AVATARES[(nome.charCodeAt(0)||0) % AVATARES.length];
const iniciais   = (nome='') => nome.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();

export default function Usuarios() {
  const admin = isAdmin();

  const [usuarios,  setUsuarios]  = useState([]);
  const [tenants,   setTenants]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(FORM_EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [confirm,   setConfirm]   = useState(null);
  const [toast,     setToast]     = useState(null);
  const [tenantMode, setTenantMode] = useState('existente'); // 'existente' | 'novo'

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const [u, t] = await Promise.all([
        api.get('/auth/usuarios'),
        api.get('/auth/tenants'),
      ]);
      setUsuarios(Array.isArray(u) ? u : []);
      setTenants(Array.isArray(t) ? t : []);
    } catch { setUsuarios([]); setTenants([]); }
    finally { setLoading(false); }
  }, [admin]);

  useEffect(() => { load(); }, [load]);

  const filtered = usuarios.filter(u =>
    !search ||
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const abrirModal = () => {
    setForm(FORM_EMPTY);
    setFormErr('');
    setTenantMode('existente');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome || !form.email || !form.senha) { setFormErr('Nome, e-mail e senha são obrigatórios.'); return; }
    if (form.senha !== form.confirmar_senha)        { setFormErr('As senhas não coincidem.'); return; }
    if (form.senha.length < 6)                      { setFormErr('Senha deve ter ao menos 6 caracteres.'); return; }
    if (!form.admin && tenantMode === 'existente' && !form.tenant_id) { setFormErr('Selecione um tenant ou crie um novo.'); return; }

    setSaving(true); setFormErr('');
    try {
      const body = {
        nome:       form.nome,
        email:      form.email,
        senha:      form.senha,
        admin:      form.admin,
        tenant_id:   tenantMode === 'existente' ? form.tenant_id : null,
        tenant_nome: tenantMode === 'novo'       ? form.novo_tenant : null,
      };
      await api.post('/auth/cadastro', body);
      showToast(`Usuário ${form.nome} criado!`);
      setShowModal(false);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleAtivo = async (u) => {
    try {
      await api.put(`/auth/usuarios/${u.id}`, { ativo: !u.ativo });
      showToast(u.ativo ? `${u.nome} desativado.` : `${u.nome} ativado.`, u.ativo ? '🔒' : '🔓');
      load();
    } catch(e) { showToast(e.message, '✕'); }
  };

  const deletar = async (u) => {
    try {
      await api.del(`/auth/usuarios/${u.id}`);
      showToast(`${u.nome} removido.`, '🗑');
      setConfirm(null); load();
    } catch(e) { showToast(e.message, '✕'); }
  };

  if (!admin) return (
    <>
      <style>{S}</style>
      <div className="pg">
        <div className="denied">
          <div className="denied-icon">🔒</div>
          <div className="denied-title">Acesso restrito</div>
          <div className="denied-sub">Apenas administradores podem gerenciar usuários.</div>
        </div>
      </div>
    </>
  );

  const ativos   = usuarios.filter(u => u.ativo).length;
  const admins   = usuarios.filter(u => u.admin).length;
  const nTenants = tenants.length;

  return (
    <>
      <style>{S}</style>
      <div className="pg">
        {/* Header */}
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Usuários</div>
            <div className="pg-sub">{usuarios.length} usuário(s) · acesso admin</div>
          </div>
          <button className="btn btn-primary" onClick={abrirModal}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Usuário
          </button>
        </div>

        {/* Stats */}
        <div className="stats">
          {[
            { label:'Total',    val:usuarios.length, color:'#00d4aa' },
            { label:'Ativos',   val:ativos,          color:'#0099ff' },
            { label:'Admins',   val:admins,          color:'#a855f7' },
            { label:'Tenants',  val:nTenants,        color:'#ff6b35' },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="st-dot" style={{background:s.color}}/>
              <div><div className="st-val">{s.val}</div><div className="st-lbl">{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div className="filters">
          <div className="srch">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16}}>×</button>}
          </div>
        </div>

        {/* Tabela */}
        <div className="card">
          <div className="tbl-wrap">
            {loading ? (
              <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
                {[1,2,3].map(i=><div key={i} className="skel" style={{height:52}}/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty">Nenhum usuário encontrado</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Tenant</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const tenant = tenants.find(t=>t.id===u.tenant_id);
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="avatar" style={{background:`${avatarCor(u.nome)}22`,color:avatarCor(u.nome)}}>
                              {iniciais(u.nome)}
                            </div>
                            <div>
                              <div style={{fontWeight:700,fontSize:13,color:'#e8eaed'}}>{u.nome}</div>
                              <div style={{fontSize:11,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace'}}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{fontSize:12}}>
                          {u.admin ? <span style={{color:'rgba(232,234,237,.25)'}}>— global —</span>
                                   : tenant ? tenant.nome : <span style={{color:'#ff6b35'}}>sem tenant</span>}
                        </td>
                        <td>
                          {u.admin
                            ? <span className="badge b-purple">ADMIN</span>
                            : <span className="badge b-gray">USUÁRIO</span>}
                        </td>
                        <td>
                          {u.ativo
                            ? <span className="badge b-green">ATIVO</span>
                            : <span className="badge b-red">INATIVO</span>}
                        </td>
                        <td>
                          <div className="act-btns">
                            <button className="ib warning" title={u.ativo?'Desativar':'Ativar'} onClick={()=>toggleAtivo(u)}>
                              {u.ativo
                                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>}
                            </button>
                            <button className="ib danger" title="Remover" onClick={()=>setConfirm(u)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
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
        </div>
      </div>

      {/* Modal criar usuário */}
      {showModal && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxHeight:'90vh',overflowY:'auto'}}>
            <div className="mhd">
              <div>
                <div className="mtitle">Novo Usuário</div>
                <div className="msub">Preencha os dados de acesso</div>
              </div>
              <button className="mclose" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}

              <div className="fr2">
                <div className="ff">
                  <label className="fl">Nome *</label>
                  <input className="fi" placeholder="Nome completo" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">E-mail *</label>
                  <input className="fi" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
              </div>

              <div className="fr2">
                <div className="ff">
                  <label className="fl">Senha *</label>
                  <input className="fi" type="password" placeholder="mín. 6 caracteres" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="fl">Confirmar senha *</label>
                  <input className="fi" type="password" placeholder="repita a senha" value={form.confirmar_senha} onChange={e=>setForm(f=>({...f,confirmar_senha:e.target.value}))}/>
                </div>
              </div>

              {/* Toggle admin */}
              <div className="ftoggle" onClick={()=>setForm(f=>({...f,admin:!f.admin}))}>
                <div>
                  <div className="toggle-lbl">Administrador</div>
                  <div className="toggle-sub">Pode ver todos os dados e gerenciar usuários</div>
                </div>
                <div className={`toggle-sw${form.admin?' on':''}`}><div className="toggle-knob"/></div>
              </div>

              {/* Tenant — só para não-admins */}
              {!form.admin && (
                <div className="ff">
                  <label className="fl">Empresa (Tenant)</label>
                  <div style={{display:'flex',gap:8,marginBottom:10}}>
                    {['existente','novo'].map(m => (
                      <button key={m} onClick={()=>setTenantMode(m)} className="btn" style={{
                        flex:1, background:tenantMode===m?'rgba(0,212,170,.1)':'rgba(255,255,255,.04)',
                        border:`1px solid ${tenantMode===m?'rgba(0,212,170,.4)':'rgba(255,255,255,.08)'}`,
                        color:tenantMode===m?'#00d4aa':'rgba(232,234,237,.5)', fontSize:11, padding:'7px 10px',
                      }}>
                        {m === 'existente' ? 'Tenant existente' : 'Criar novo tenant'}
                      </button>
                    ))}
                  </div>

                  {tenantMode === 'existente' ? (
                    <div className="tenant-sel">
                      {tenants.length === 0
                        ? <div style={{fontSize:12,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace'}}>Nenhum tenant cadastrado</div>
                        : tenants.map(t => (
                          <div key={t.id} className={`tenant-opt${form.tenant_id===t.id?' selected':''}`}
                            onClick={()=>setForm(f=>({...f,tenant_id:t.id}))}>
                            <div className="to-dot"/>
                            <div style={{flex:1}}>{t.nome}</div>
                            <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.3)'}}>{t.usuarios} usuário(s)</div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <input className="fi" placeholder="Nome da nova empresa" value={form.novo_tenant}
                      onChange={e=>setForm(f=>({...f,novo_tenant:e.target.value}))}/>
                  )}
                </div>
              )}
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirm && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div className="confirm">
            <div className="ct">Remover {confirm.nome}?</div>
            <div className="cx">O usuário perderá o acesso permanentemente. Seus dados criados não serão apagados.</div>
            <div className="ca">
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={()=>deletar(confirm)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}