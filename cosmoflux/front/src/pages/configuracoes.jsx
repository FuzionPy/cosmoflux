import { useState, useEffect, useRef, useCallback } from 'react';

/* ── API ──────────────────────────────────────────────────────────────── */
// Perfil/senha usam o auth_router (registrado no backend com prefix '/auth', SEM '/api').
// É o mesmo padrão do authService.js — não misturar com o BASE das outras telas.
const AUTH_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const tok  = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h    = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api  = {
  get: url    => fetch(AUTH_BASE+url,{headers:h()}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put: (u,b)  => fetch(AUTH_BASE+u,{method:'PUT',headers:h(),body:JSON.stringify(b||{})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};
const getDocTheme = () => { try{return document.documentElement.getAttribute('data-theme')||'dark';}catch{return 'dark';} };
const THEME_KEY = 'cf-theme';

/* ── helpers ──────────────────────────────────────────────────────────── */
const inicial = (n) => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ── ícones ───────────────────────────────────────────────────────────── */
const Ic = ({d,size=16,sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0}}>{d}</svg>
);
const ICONS = {
  user:   <><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></>,
  lock:   <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  bulb:   <><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3v1h6v-1c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2Z"/></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="4"/></>,
  eye:    <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19 19 0 0 1 4.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19 19 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></>,
  moon:   <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>,
  sun:    <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  laptop: <><rect x="2" y="4" width="20" height="12" rx="2"/><path d="M0 20h24"/></>,
  check:  <path d="M20 6 9 17l-5-5"/>,
  x:      <><path d="M18 6L6 18M6 6l12 12"/></>,
};

/* ── CSS ──────────────────────────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.cf-cfg-root *,.cf-cfg-root *::before,.cf-cfg-root *::after{box-sizing:border-box;}
.cf-cfg-root{--font-ui:'Plus Jakarta Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--brand:#9166d8;--radius:15px;--radius-sm:10px;--gap:16px;--ok:#21a06d;--warn:#e08a2a;--crit:#e2514f;font-family:var(--font-ui);padding:24px;animation:cfcIn .3s ease both;}
@keyframes cfcIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cf-cfg-root[data-theme="dark"],.cf-cfg-root:not([data-theme]){--bg:#0a0b0f;--surface:#111319;--surface-2:#171a21;--elevated:#1a1e26;--border:rgba(255,255,255,.075);--border-strong:rgba(255,255,255,.15);--track:rgba(255,255,255,.08);--text:#edeef3;--text-dim:rgba(237,238,243,.6);--text-muted:rgba(237,238,243,.34);--shadow:0 8px 28px rgba(0,0,0,.32);}
.cf-cfg-root[data-theme="light"]{--bg:#f3f1f5;--surface:#fff;--surface-2:#f8f6fa;--elevated:#fff;--border:rgba(28,20,36,.1);--border-strong:rgba(28,20,36,.2);--track:rgba(28,20,36,.08);--text:#1b1722;--text-dim:rgba(27,23,34,.62);--text-muted:rgba(27,23,34,.42);--shadow:0 10px 30px rgba(28,20,36,.07);}
.cf-cfg-root{--brand-soft:color-mix(in oklab,var(--brand) 14%,transparent);--brand-line:color-mix(in oklab,var(--brand) 32%,transparent);color:var(--text);}

.cf-cfg{display:flex;flex-direction:column;gap:var(--gap);max-width:900px;margin:0 auto;}
.cf-cfg-head-t{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.cf-cfg-head-s{font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px;}

.cf-cfg-body{display:grid;grid-template-columns:240px 1fr;gap:var(--gap);align-items:flex-start;}
@media(max-width:840px){.cf-cfg-body{grid-template-columns:1fr;}}

.cf-cfg-tabs{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:2px;position:sticky;top:20px;}
.cf-cfg-tab{display:flex;align-items:center;gap:11px;padding:11px 14px;border:none;background:none;border-radius:10px;cursor:pointer;font-family:var(--font-ui);font-size:13.5px;font-weight:600;color:var(--text-dim);transition:all .15s;text-align:left;}
.cf-cfg-tab:hover:not(.on){color:var(--text);background:var(--surface-2);}
.cf-cfg-tab.on{background:var(--brand-soft);color:var(--brand);}
.cf-cfg-tab-ic{width:26px;height:26px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:currentColor;}
.cf-cfg-tab.on .cf-cfg-tab-ic{background:color-mix(in oklab,var(--brand) 20%,transparent);}
@media(max-width:840px){.cf-cfg-tabs{flex-direction:row;overflow-x:auto;position:relative;top:auto;}.cf-cfg-tab{flex-shrink:0;}}

.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:24px;display:flex;flex-direction:column;gap:20px;}
.cf-card-t{font-size:16px;font-weight:800;letter-spacing:-.01em;}
.cf-card-s{font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5;}
.cf-cfg-alert{font-size:12px;background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border:1px solid color-mix(in oklab,var(--crit) 25%,transparent);border-radius:8px;padding:10px 13px;display:flex;align-items:center;gap:8px;}
.cf-cfg-ok{font-size:12px;background:color-mix(in oklab,var(--ok) 10%,transparent);color:var(--ok);border:1px solid color-mix(in oklab,var(--ok) 25%,transparent);border-radius:8px;padding:10px 13px;display:flex;align-items:center;gap:8px;}

.cf-cfg-avatar-row{display:flex;align-items:center;gap:18px;padding:6px 0;}
.cf-cfg-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(140deg,color-mix(in oklab,var(--brand) 72%,#7a4df0),var(--brand));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:800;flex-shrink:0;overflow:hidden;position:relative;}
.cf-cfg-avatar img{width:100%;height:100%;object-fit:cover;}
.cf-cfg-avatar-info{flex:1;min-width:0;}
.cf-cfg-avatar-t{font-size:13px;font-weight:700;margin-bottom:4px;}
.cf-cfg-avatar-s{font-size:11.5px;color:var(--text-muted);line-height:1.5;}
.cf-cfg-avatar-btns{display:flex;gap:8px;margin-top:10px;}
.cf-cfg-file{display:none;}

.cf-cfg-form{display:flex;flex-direction:column;gap:14px;}
.cf-cfg-field{display:flex;flex-direction:column;gap:6px;}
.cf-cfg-label{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono);}
.cf-cfg-input{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 14px;font-size:13.5px;color:var(--text);font-family:var(--font-ui);outline:none;transition:border-color .18s,box-shadow .18s;}
.cf-cfg-input:focus{border-color:var(--brand-line);box-shadow:0 0 0 3px var(--brand-soft);}
.cf-cfg-input.err{border-color:color-mix(in oklab,var(--crit) 45%,transparent);}
.cf-cfg-input-wrap{position:relative;}
.cf-cfg-input-wrap .cf-cfg-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;}
.cf-cfg-hint{font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);}

.cf-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cf-btn:hover:not(:disabled){border-color:var(--border-strong);}
.cf-btn:disabled{opacity:.5;cursor:not-allowed;}
.cf-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.cf-btn-primary:hover:not(:disabled){filter:brightness(1.08);}
.cf-btn-ghost{background:transparent;}
.cf-btn-danger{background:color-mix(in oklab,var(--crit) 10%,transparent);color:var(--crit);border-color:color-mix(in oklab,var(--crit) 28%,transparent);}
.cf-btn.sm{padding:7px 12px;font-size:12px;}
.cf-cfg-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:6px;}

/* preferências: cards de tema */
.cf-cfg-themes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:600px){.cf-cfg-themes{grid-template-columns:1fr;}}
.cf-cfg-theme{background:var(--surface-2);border:2px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;transition:all .16s;display:flex;flex-direction:column;gap:10px;position:relative;}
.cf-cfg-theme:hover{border-color:var(--border-strong);}
.cf-cfg-theme.on{border-color:var(--brand);background:var(--brand-soft);}
.cf-cfg-theme-check{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;background:var(--brand);color:#fff;display:none;align-items:center;justify-content:center;}
.cf-cfg-theme.on .cf-cfg-theme-check{display:flex;}
.cf-cfg-theme-preview{width:100%;height:70px;border-radius:8px;overflow:hidden;position:relative;border:1px solid var(--border);}
.cf-cfg-theme-preview.dark{background:linear-gradient(135deg,#0a0b0f 0%,#171a21 100%);}
.cf-cfg-theme-preview.light{background:linear-gradient(135deg,#f3f1f5 0%,#fff 100%);}
.cf-cfg-theme-preview.system{background:linear-gradient(135deg,#0a0b0f 0%,#0a0b0f 49%,#f3f1f5 51%,#fff 100%);}
.cf-cfg-theme-preview-bar{position:absolute;top:12px;left:12px;right:12px;height:4px;background:color-mix(in oklab,#9166d8 60%,transparent);border-radius:2px;}
.cf-cfg-theme-preview-dot{position:absolute;bottom:12px;left:12px;width:16px;height:16px;border-radius:4px;background:#9166d8;}
.cf-cfg-theme-preview-line{position:absolute;bottom:14px;left:34px;right:12px;height:3px;background:color-mix(in oklab,#9166d8 30%,transparent);border-radius:2px;}
.cf-cfg-theme-ic{display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px;font-weight:700;}
.cf-cfg-theme-s{font-size:11px;color:var(--text-muted);font-family:var(--font-mono);}

.cf-cfg-loading{padding:60px 20px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;}
.cf-skel{background:linear-gradient(90deg,var(--track) 25%,var(--surface-2) 50%,var(--track) 75%);background-size:200% 100%;animation:cfcSh 1.5s infinite;border-radius:8px;}
@keyframes cfcSh{from{background-position:200% 0}to{background-position:-200% 0}}

.cf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;z-index:300;box-shadow:var(--shadow);animation:cfcFade .3s ease both;white-space:nowrap;}
@keyframes cfcFade{from{opacity:0}to{opacity:1}}
.cf-toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok);flex-shrink:0;}
.cf-toast-ic.err{background:color-mix(in oklab,var(--crit) 14%,transparent);color:var(--crit);}
`;

/* ══════════════════════════════════════════════════════════════════════ */
/* ABA · PERFIL                                                           */
/* ══════════════════════════════════════════════════════════════════════ */
function AbaPerfil({ onToast }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null); // dataURL
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get('/auth/perfil');
        setNome(p.nome || '');
        setEmail(p.email || '');
        setAvatar(p.avatar || null);
      } catch (e) { setErro(e.message || 'Erro ao carregar perfil'); }
      finally { setLoading(false); }
    })();
  }, []);

  const escolherArquivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onToast('Foto muito grande (máximo 2 MB)', 'err'); return;
    }
    const r = new FileReader();
    r.onload = () => setAvatar(r.result);
    r.readAsDataURL(file);
  };

  const removerAvatar = () => setAvatar(null);

  const salvar = async () => {
    setErro(''); setOk('');
    if (!nome.trim()) { setErro('O nome é obrigatório'); return; }
    if (!isEmail(email)) { setErro('E-mail inválido'); return; }
    setSalvando(true);
    try {
      await api.put('/auth/perfil', { nome: nome.trim(), email: email.trim(), avatar });
      setOk('Perfil atualizado com sucesso');
      onToast('Perfil atualizado');
      setTimeout(() => setOk(''), 4000);
    } catch (e) {
      setErro(e.message || 'Erro ao salvar perfil');
    } finally { setSalvando(false); }
  };

  if (loading) return (
    <div className="cf-card">
      <div className="cf-skel" style={{height:80}}/>
      <div className="cf-skel" style={{height:44}}/>
      <div className="cf-skel" style={{height:44}}/>
    </div>
  );

  return (
    <div className="cf-card">
      <div>
        <div className="cf-card-t">Meu perfil</div>
        <div className="cf-card-s">Nome e e-mail que aparecem no sistema. Foto opcional (máx. 2 MB).</div>
      </div>

      {erro && <div className="cf-cfg-alert">⚠ {erro}</div>}
      {ok && <div className="cf-cfg-ok"><Ic d={ICONS.check} size={14}/> {ok}</div>}

      <div className="cf-cfg-avatar-row">
        <div className="cf-cfg-avatar">
          {avatar ? <img src={avatar} alt="avatar"/> : inicial(nome)}
        </div>
        <div className="cf-cfg-avatar-info">
          <div className="cf-cfg-avatar-t">Foto de perfil</div>
          <div className="cf-cfg-avatar-s">Aceita JPG ou PNG · aparece no seu menu superior e no histórico de vendas.</div>
          <div className="cf-cfg-avatar-btns">
            <button className="cf-btn cf-btn-ghost sm" onClick={() => fileRef.current?.click()}><Ic d={ICONS.camera} size={13}/> Escolher foto</button>
            {avatar && <button className="cf-btn cf-btn-danger sm" onClick={removerAvatar}><Ic d={ICONS.x} size={13}/> Remover</button>}
          </div>
          <input ref={fileRef} className="cf-cfg-file" type="file" accept="image/*" onChange={escolherArquivo}/>
        </div>
      </div>

      <div className="cf-cfg-form">
        <div className="cf-cfg-field">
          <label className="cf-cfg-label">Nome</label>
          <input className="cf-cfg-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo"/>
        </div>
        <div className="cf-cfg-field">
          <label className="cf-cfg-label">E-mail</label>
          <input className={`cf-cfg-input${email && !isEmail(email) ? ' err' : ''}`} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com"/>
          <span className="cf-cfg-hint">Usado para acessar o sistema. Mudança de e-mail afeta o próximo login.</span>
        </div>
      </div>

      <div className="cf-cfg-actions">
        <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ABA · SENHA                                                            */
/* ══════════════════════════════════════════════════════════════════════ */
function AbaSenha({ onToast }) {
  const [sAtual, setSAtual] = useState('');
  const [sNova, setSNova] = useState('');
  const [sConfirmar, setSConfirmar] = useState('');
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const forca = (s) => {
    if (!s) return { nivel: 0, txt: '', cor: 'var(--text-muted)' };
    let pts = 0;
    if (s.length >= 8) pts++;
    if (/[a-z]/.test(s) && /[A-Z]/.test(s)) pts++;
    if (/\d/.test(s)) pts++;
    if (/[^a-zA-Z0-9]/.test(s)) pts++;
    const nivel = Math.min(pts, 3);
    return [
      { nivel: 0, txt: 'muito fraca', cor: 'var(--crit)' },
      { nivel: 1, txt: 'fraca',       cor: 'var(--crit)' },
      { nivel: 2, txt: 'média',       cor: 'var(--warn)' },
      { nivel: 3, txt: 'forte',       cor: 'var(--ok)' },
    ][nivel];
  };
  const f = forca(sNova);

  const salvar = async () => {
    setErro(''); setOk('');
    if (!sAtual) { setErro('Informe a senha atual'); return; }
    if (sNova.length < 8) { setErro('A nova senha deve ter no mínimo 8 caracteres'); return; }
    if (sNova !== sConfirmar) { setErro('A confirmação não bate com a nova senha'); return; }
    if (sNova === sAtual) { setErro('A nova senha deve ser diferente da atual'); return; }
    setSalvando(true);
    try {
      await api.put('/auth/perfil/senha', { senha_atual: sAtual, senha_nova: sNova });
      setOk('Senha alterada com sucesso');
      onToast('Senha alterada');
      setSAtual(''); setSNova(''); setSConfirmar('');
      setTimeout(() => setOk(''), 4000);
    } catch (e) {
      setErro(e.message || 'Erro ao alterar senha');
    } finally { setSalvando(false); }
  };

  return (
    <div className="cf-card">
      <div>
        <div className="cf-card-t">Alterar senha</div>
        <div className="cf-card-s">Escolha uma senha forte e diferente da atual. Mínimo de 8 caracteres, com letras, números e (idealmente) símbolos.</div>
      </div>

      {erro && <div className="cf-cfg-alert">⚠ {erro}</div>}
      {ok && <div className="cf-cfg-ok"><Ic d={ICONS.check} size={14}/> {ok}</div>}

      <div className="cf-cfg-form">
        <div className="cf-cfg-field">
          <label className="cf-cfg-label">Senha atual</label>
          <div className="cf-cfg-input-wrap">
            <input className="cf-cfg-input" type={showAtual ? 'text' : 'password'} value={sAtual} onChange={e => setSAtual(e.target.value)} autoComplete="current-password" style={{paddingRight:38}}/>
            <button className="cf-cfg-toggle" onClick={() => setShowAtual(v => !v)} type="button" title={showAtual ? 'Ocultar' : 'Mostrar'}><Ic d={showAtual ? ICONS.eyeOff : ICONS.eye} size={16}/></button>
          </div>
        </div>
        <div className="cf-cfg-field">
          <label className="cf-cfg-label">Nova senha</label>
          <div className="cf-cfg-input-wrap">
            <input className="cf-cfg-input" type={showNova ? 'text' : 'password'} value={sNova} onChange={e => setSNova(e.target.value)} autoComplete="new-password" style={{paddingRight:38}}/>
            <button className="cf-cfg-toggle" onClick={() => setShowNova(v => !v)} type="button" title={showNova ? 'Ocultar' : 'Mostrar'}><Ic d={showNova ? ICONS.eyeOff : ICONS.eye} size={16}/></button>
          </div>
          {sNova && <span className="cf-cfg-hint" style={{color: f.cor, fontWeight:600}}>Força: {f.txt}</span>}
        </div>
        <div className="cf-cfg-field">
          <label className="cf-cfg-label">Confirmar nova senha</label>
          <input className={`cf-cfg-input${sConfirmar && sNova !== sConfirmar ? ' err' : ''}`} type={showNova ? 'text' : 'password'} value={sConfirmar} onChange={e => setSConfirmar(e.target.value)} autoComplete="new-password"/>
          {sConfirmar && sNova !== sConfirmar && <span className="cf-cfg-hint" style={{color:'var(--crit)'}}>As senhas não são iguais</span>}
        </div>
      </div>

      <div className="cf-cfg-actions">
        <button className="cf-btn cf-btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Alterando…' : 'Alterar senha'}</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ABA · PREFERÊNCIAS                                                     */
/* ══════════════════════════════════════════════════════════════════════ */
function AbaPreferencias({ onToast, onThemeChange }) {
  const [pref, setPref] = useState(() => { try{return localStorage.getItem(THEME_KEY) || 'system';}catch{return 'system';} });

  const applyTema = (novoPref) => {
    setPref(novoPref);
    try { localStorage.setItem(THEME_KEY, novoPref); } catch {}
    // resolve o tema aplicado (system → light/dark conforme SO)
    const resolvido = novoPref === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : novoPref;
    document.documentElement.setAttribute('data-theme', resolvido);
    onThemeChange?.(resolvido);
    onToast('Tema atualizado');
  };

  const OPCOES = [
    { key: 'dark',   ic: 'moon',   label: 'Escuro', sub: 'padrão do sistema' },
    { key: 'light',  ic: 'sun',    label: 'Claro',  sub: 'melhor com luz do dia' },
    { key: 'system', ic: 'laptop', label: 'Automático', sub: 'segue o seu computador' },
  ];

  return (
    <div className="cf-card">
      <div>
        <div className="cf-card-t">Aparência</div>
        <div className="cf-card-s">Escolha como o CosmoFlux deve aparecer para você. A preferência é salva neste navegador.</div>
      </div>

      <div className="cf-cfg-themes">
        {OPCOES.map(o => (
          <div key={o.key} className={`cf-cfg-theme${pref === o.key ? ' on' : ''}`} onClick={() => applyTema(o.key)}>
            <div className="cf-cfg-theme-check"><Ic d={ICONS.check} size={12}/></div>
            <div className={`cf-cfg-theme-preview ${o.key}`}>
              <div className="cf-cfg-theme-preview-bar"/>
              <div className="cf-cfg-theme-preview-dot"/>
              <div className="cf-cfg-theme-preview-line"/>
            </div>
            <div className="cf-cfg-theme-ic"><Ic d={ICONS[o.ic]} size={14}/> {o.label}</div>
            <div className="cf-cfg-theme-s">{o.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════ */
const TABS = [
  { key: 'perfil',       label: 'Perfil',       ic: 'user' },
  { key: 'senha',        label: 'Senha',        ic: 'lock' },
  { key: 'preferencias', label: 'Preferências', ic: 'bulb' },
];

export default function Configuracoes() {
  const [theme, setTheme] = useState(getDocTheme);
  const [aba, setAba] = useState('perfil');
  const [toast, setToast] = useState(null);

  useEffect(()=>{
    const obs=new MutationObserver(()=>setTheme(getDocTheme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>obs.disconnect();
  },[]);

  const showToast = useCallback((msg, tone = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3000); }, []);

  return (
    <div className="cf-cfg-root" data-theme={theme}>
      <style>{S}</style>
      <div className="cf-cfg">

        <div>
          <div className="cf-cfg-head-t">Configurações</div>
          <div className="cf-cfg-head-s">gerencie seu perfil, segurança e preferências visuais</div>
        </div>

        <div className="cf-cfg-body">
          <div className="cf-cfg-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`cf-cfg-tab${aba === t.key ? ' on' : ''}`} onClick={() => setAba(t.key)}>
                <span className="cf-cfg-tab-ic"><Ic d={ICONS[t.ic]} size={14}/></span>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {aba === 'perfil'       && <AbaPerfil onToast={showToast}/>}
            {aba === 'senha'        && <AbaSenha onToast={showToast}/>}
            {aba === 'preferencias' && <AbaPreferencias onToast={showToast} onThemeChange={setTheme}/>}
          </div>
        </div>
      </div>

      {toast && <div className="cf-toast"><span className={`cf-toast-ic ${toast.tone}`}>{toast.tone === 'ok' ? '✓' : '×'}</span>{toast.msg}</div>}
    </div>
  );
}