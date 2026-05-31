import { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000');
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  put:  (url,b) => fetch(BASE+url,{method:'PUT',headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus Jakarta Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Plus Jakarta Sans',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;max-width:700px;margin:0 auto;width:100%;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pg-hdr{display:flex;flex-direction:column;gap:4px;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.tabs{display:flex;gap:4px;background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:4px;}
.tab{flex:1;padding:9px 16px;border-radius:7px;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;color:rgba(232,234,237,.4);background:none;}
.tab.active{background:#13161a;color:#e8eaed;box-shadow:0 1px 4px rgba(0,0,0,.3);}
.tab:hover:not(.active){color:rgba(232,234,237,.7);}

.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:18px;}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.05);}

/* Avatar */
.avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0;}
.avatar-big{width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,#a070ff,#5e2cb4);display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:800;color:#fff;overflow:hidden;position:relative;box-shadow:0 8px 24px rgba(124,58,237,.3);}
.avatar-big img{width:100%;height:100%;object-fit:cover;}
.avatar-big-empty{user-select:none;}
.avatar-actions{display:flex;gap:8px;}
.avatar-hint{font-size:10px;color:rgba(232,234,237,.3);font-family:'JetBrains Mono',monospace;}

.ff{display:flex;flex-direction:column;gap:6px;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:11px 14px;font-size:13px;color:#e8eaed;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.fi:disabled{opacity:.5;cursor:not-allowed;}
.fi.readonly{background:rgba(255,255,255,.02);color:rgba(232,234,237,.4);}

.hint{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:3px;}
.hint.err{color:#ff4757;}
.hint.ok{color:#00d4aa;}

.row-end{display:flex;gap:10px;justify-content:flex-end;padding-top:4px;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.08);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.18);}
.btn-sm{padding:6px 12px;font-size:12px;}

.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}
.fok{background:rgba(0,212,170,.08);border:1px solid rgba(0,212,170,.25);border-radius:8px;padding:10px 14px;font-size:12px;color:#00d4aa;font-family:'JetBrains Mono',monospace;}

.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}

@media(max-width:768px){.pg{padding:14px;gap:14px;}}
`;

export default function Configuracoes() {
  const [aba,      setAba]      = useState('perfil'); // 'perfil' | 'senha'
  const [perfil,   setPerfil]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Perfil form
  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [avatar,   setAvatar]   = useState('');
  const [savingP,  setSavingP]  = useState(false);
  const [msgP,     setMsgP]     = useState(null); // {type:'ok'|'err', txt}

  // Senha form
  const [sAtual,   setSAtual]   = useState('');
  const [sNova,    setSNova]    = useState('');
  const [sConf,    setSConf]    = useState('');
  const [savingS,  setSavingS]  = useState(false);
  const [msgS,     setMsgS]     = useState(null);

  const [toast,    setToast]    = useState(null);
  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get('/auth/perfil');
        setPerfil(p);
        setNome(p.nome || '');
        setEmail(p.email || '');
        setAvatar(p.avatar || '');
      } finally { setLoading(false); }
    })();
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsgP({type:'err',txt:'Arquivo deve ser uma imagem'}); return; }
    if (file.size > 2 * 1024 * 1024) { setMsgP({type:'err',txt:'Imagem deve ter no máximo 2MB'}); return; }
    const reader = new FileReader();
    reader.onload = evt => setAvatar(evt.target.result);
    reader.readAsDataURL(file);
  };

  const salvarPerfil = async () => {
    setMsgP(null);
    if (!nome.trim()) { setMsgP({type:'err',txt:'Nome é obrigatório'}); return; }
    if (!email.trim()) { setMsgP({type:'err',txt:'Email é obrigatório'}); return; }
    setSavingP(true);
    try {
      const res = await api.put('/auth/perfil', { nome: nome.trim(), email: email.trim(), avatar });
      // atualiza localStorage
      const store = localStorage.getItem('token') ? localStorage : sessionStorage;
      store.setItem('nome', res.nome);
      store.setItem('email', res.email);
      if (res.avatar) store.setItem('avatar', res.avatar);
      else store.removeItem('avatar');
      showToast('Perfil atualizado!');
      setMsgP({type:'ok',txt:'Dados salvos com sucesso'});
      // dispara evento para sidebar atualizar
      window.dispatchEvent(new Event('perfil-atualizado'));
    } catch(e) {
      setMsgP({type:'err',txt:e.message});
    } finally { setSavingP(false); }
  };

  const trocarSenha = async () => {
    setMsgS(null);
    if (!sAtual || !sNova || !sConf) { setMsgS({type:'err',txt:'Preencha todos os campos'}); return; }
    if (sNova.length < 4) { setMsgS({type:'err',txt:'Nova senha deve ter ao menos 4 caracteres'}); return; }
    if (sNova !== sConf) { setMsgS({type:'err',txt:'As senhas não coincidem'}); return; }
    setSavingS(true);
    try {
      await api.put('/auth/perfil/senha', { senha_atual: sAtual, senha_nova: sNova });
      showToast('Senha alterada!');
      setMsgS({type:'ok',txt:'Senha alterada com sucesso'});
      setSAtual(''); setSNova(''); setSConf('');
    } catch(e) {
      setMsgS({type:'err',txt:e.message});
    } finally { setSavingS(false); }
  };

  const removerAvatar = () => { setAvatar(''); if (fileRef.current) fileRef.current.value = ''; };

  if (loading) return <div style={{padding:24,color:'rgba(232,234,237,.4)'}}>Carregando...</div>;

  return (
    <>
      <style>{S}</style>
      <div className="pg">
        <div className="pg-hdr">
          <div className="pg-title">Configurações</div>
          <div className="pg-sub">Edite seus dados e preferências</div>
        </div>

        <div className="tabs">
          <button className={`tab${aba==='perfil'?' active':''}`} onClick={()=>setAba('perfil')}>Perfil</button>
          <button className={`tab${aba==='senha'?' active':''}`} onClick={()=>setAba('senha')}>Senha</button>
        </div>

        {aba === 'perfil' && (
          <div className="card">
            <div className="sec-title">Foto de perfil</div>
            <div className="avatar-wrap">
              <div className="avatar-big">
                {avatar ? <img src={avatar} alt="avatar"/> :
                  <span className="avatar-big-empty">{nome?.[0]?.toUpperCase() || '?'}</span>}
              </div>
              <div className="avatar-actions">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
                <button className="btn btn-ghost btn-sm" onClick={()=>fileRef.current?.click()}>
                  {avatar ? 'Trocar foto' : 'Enviar foto'}
                </button>
                {avatar && (
                  <button className="btn btn-danger btn-sm" onClick={removerAvatar}>Remover</button>
                )}
              </div>
              <div className="avatar-hint">PNG, JPG — máx. 2MB</div>
            </div>

            <div className="sec-title">Dados pessoais</div>

            {msgP && <div className={msgP.type==='ok'?'fok':'ferr'}>{msgP.type==='ok'?'✓':'⚠'} {msgP.txt}</div>}

            <div className="ff">
              <label className="fl">Nome</label>
              <input className="fi" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome"/>
            </div>

            <div className="ff">
              <label className="fl">Email</label>
              <input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
            </div>

            <div className="ff">
              <label className="fl">Tipo de conta</label>
              <input className="fi readonly" value={perfil?.admin ? 'Administrador' : 'Usuário'} disabled/>
            </div>

            <div className="row-end">
              <button className="btn btn-primary" onClick={salvarPerfil} disabled={savingP}>
                {savingP ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}

        {aba === 'senha' && (
          <div className="card">
            <div className="sec-title">Trocar senha</div>

            {msgS && <div className={msgS.type==='ok'?'fok':'ferr'}>{msgS.type==='ok'?'✓':'⚠'} {msgS.txt}</div>}

            <div className="ff">
              <label className="fl">Senha atual</label>
              <input className="fi" type="password" value={sAtual} onChange={e=>setSAtual(e.target.value)} placeholder="••••••"/>
            </div>

            <div className="ff">
              <label className="fl">Nova senha</label>
              <input className="fi" type="password" value={sNova} onChange={e=>setSNova(e.target.value)} placeholder="Mínimo 4 caracteres"/>
            </div>

            <div className="ff">
              <label className="fl">Confirmar nova senha</label>
              <input className="fi" type="password" value={sConf} onChange={e=>setSConf(e.target.value)} placeholder="Repita a nova senha"/>
              {sConf && sNova !== sConf && <div className="hint err">As senhas não coincidem</div>}
              {sConf && sNova === sConf && sNova.length >= 4 && <div className="hint ok">Senhas coincidem</div>}
            </div>

            <div className="row-end">
              <button className="btn btn-primary" onClick={trocarSenha} disabled={savingS}>
                {savingS ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}