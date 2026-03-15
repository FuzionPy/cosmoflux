import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .cf-root {
    min-height: 100vh; background: #04050a;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; overflow: hidden; position: relative;
  }
  .cf-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .cf-star {
    position: absolute; border-radius: 50%; background: white;
    animation: twinkle var(--dur, 3s) ease-in-out infinite var(--delay, 0s);
  }
  @keyframes twinkle {
    0%, 100% { opacity: var(--min-op, 0.1); transform: scale(1); }
    50%       { opacity: var(--max-op, 0.8); transform: scale(1.3); }
  }
  .cf-nebula { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
  .cf-nebula-1 {
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(94,44,180,0.18) 0%, transparent 70%);
    top: -150px; left: -150px; animation: drift1 20s ease-in-out infinite alternate;
  }
  .cf-nebula-2 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(0,200,255,0.12) 0%, transparent 70%);
    bottom: -100px; right: -100px; animation: drift2 25s ease-in-out infinite alternate;
  }
  @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.1); } }
  @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,-30px) scale(1.15); } }
  .cf-orbit {
    position: fixed; border-radius: 50%; border: 1px solid rgba(255,255,255,0.04);
    pointer-events: none; z-index: 0;
    animation: spin var(--speed, 40s) linear infinite;
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .cf-layout {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 1fr 1fr;
    width: 100%; max-width: 960px; min-height: 580px;
    border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; overflow: hidden;
    backdrop-filter: blur(8px);
    box-shadow: 0 0 80px rgba(94,44,180,0.15), 0 0 160px rgba(0,0,0,0.6);
    margin: 24px; animation: fadeUp 0.8s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: none; } }
  .cf-panel-left {
    background: linear-gradient(135deg, rgba(20,12,45,0.95) 0%, rgba(8,20,50,0.95) 100%);
    padding: 56px 48px; display: flex; flex-direction: column; justify-content: space-between;
    border-right: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden;
  }
  .cf-brand { position: relative; z-index: 2; }
  .cf-logo-mark { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
  .cf-logo-icon {
    width: 40px; height: 40px; border-radius: 50%;
    border: 2px solid rgba(140,90,255,0.6);
    display: flex; align-items: center; justify-content: center;
    background: rgba(94,44,180,0.2); position: relative;
  }
  .cf-logo-icon::before {
    content: ''; width: 16px; height: 16px; border-radius: 50%;
    background: radial-gradient(circle, #a070ff, #5e2cb4);
    box-shadow: 0 0 12px rgba(160,112,255,0.6);
  }
  .cf-logo-ring {
    position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid rgba(140,90,255,0.3); animation: spin 8s linear infinite;
  }
  .cf-logo-text {
    font-family: 'Space Mono', monospace; font-size: 14px;
    font-weight: 700; letter-spacing: 0.2em; color: rgba(255,255,255,0.9); text-transform: uppercase;
  }
  .cf-tagline { font-size: 28px; font-weight: 300; line-height: 1.35; color: rgba(255,255,255,0.85); margin-bottom: 16px; }
  .cf-tagline strong {
    font-weight: 600; color: #fff;
    background: linear-gradient(90deg, #c0a0ff, #7dd3fc);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .cf-desc { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.7; max-width: 280px; }
  .cf-features { display: flex; flex-direction: column; gap: 16px; margin-top: auto; padding-top: 40px; }
  .cf-feature { display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(255,255,255,0.45); }
  .cf-feature-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: linear-gradient(135deg, #a070ff, #7dd3fc); flex-shrink: 0;
    box-shadow: 0 0 6px rgba(160,112,255,0.5);
  }
  .cf-panel-glow {
    position: absolute; bottom: -80px; right: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(94,44,180,0.25) 0%, transparent 70%);
    pointer-events: none;
  }
  .cf-panel-right {
    background: rgba(6,8,18,0.97); padding: 56px 48px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .cf-form-heading { margin-bottom: 32px; }
  .cf-form-title {
    font-family: 'Space Mono', monospace; font-size: 22px;
    font-weight: 700; color: #fff; letter-spacing: 0.05em; margin-bottom: 6px;
  }
  .cf-form-sub { font-size: 13px; color: rgba(255,255,255,0.35); }
  .cf-error {
    background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3);
    border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #fc8181; margin-bottom: 20px;
  }
  .cf-field { margin-bottom: 18px; }
  .cf-label {
    display: block; font-size: 11px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.4); margin-bottom: 8px;
  }
  .cf-input {
    width: 100%; padding: 12px 16px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; color: #fff; font-size: 14px;
    font-family: 'Outfit', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cf-input::placeholder { color: rgba(255,255,255,0.2); }
  .cf-input:focus { border-color: rgba(160,112,255,0.5); box-shadow: 0 0 0 3px rgba(160,112,255,0.1); }
  .cf-options { display: flex; align-items: center; margin-bottom: 24px; }
  .cf-remember { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.45); cursor: pointer; }
  .cf-checkbox { accent-color: #a070ff; width: 15px; height: 15px; cursor: pointer; }
  .cf-submit {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #7c3aed, #5e2cb4);
    border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600;
    font-family: 'Space Mono', monospace; letter-spacing: 0.1em;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px;
  }
  .cf-submit:hover:not(:disabled) { background: linear-gradient(135deg, #8b5cf6, #6d28d9); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.35); }
  .cf-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .cf-spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    animation: spin 0.7s linear infinite; display: inline-block;
  }
  .cf-footer { font-size: 11px; color: rgba(255,255,255,0.2); text-align: center; margin-top: 8px; }
  @media (max-width: 720px) {
    .cf-layout { grid-template-columns: 1fr; }
    .cf-panel-left { display: none; }
    .cf-panel-right { padding: 40px 28px; }
  }
`;

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i, top: `${Math.random()*100}%`, left: `${Math.random()*100}%`,
  size: Math.random()*2.5+0.5, dur: `${Math.random()*4+2}s`, delay: `${Math.random()*4}s`,
  minOp: (Math.random()*0.1+0.05).toFixed(2), maxOp: (Math.random()*0.6+0.3).toFixed(2),
}));

const ORBITS = [
  { size: 700, speed: '60s', top: '-200px', left: '-200px' },
  { size: 500, speed: '45s', bottom: '-180px', right: '-180px' },
  { size: 300, speed: '30s', top: '20%', right: '-100px' },
];

export default function Login() {
  const navigate = useNavigate();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setIsLoading(true); setError('');
    try {
      await login(email, password, rememberMe);
      navigate('/menu');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cf-root">
        <div className="cf-stars" aria-hidden="true">
          {STARS.map(s => (
            <div key={s.id} className="cf-star" style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              '--dur': s.dur, '--delay': s.delay, '--min-op': s.minOp, '--max-op': s.maxOp,
            }} />
          ))}
        </div>
        <div className="cf-nebula cf-nebula-1" aria-hidden="true" />
        <div className="cf-nebula cf-nebula-2" aria-hidden="true" />
        {ORBITS.map((o, i) => (
          <div key={i} className="cf-orbit" aria-hidden="true" style={{
            width: o.size, height: o.size, '--speed': o.speed,
            top: o.top, left: o.left, bottom: o.bottom, right: o.right,
          }} />
        ))}
        <div className="cf-layout">
          <div className="cf-panel-left">
            <div className="cf-brand">
              <div className="cf-logo-mark">
                <div className="cf-logo-icon"><div className="cf-logo-ring" /></div>
                <span className="cf-logo-text">Cosmo Flux</span>
              </div>
              <h1 className="cf-tagline">Navegue pelo<br /><strong>universo dos seus dados</strong></h1>
              <p className="cf-desc">Acesse sua conta e continue de onde parou. Suas informações viajam seguras conosco.</p>
            </div>
            <div className="cf-features">
              {['Autenticação criptografada com Argon2','Sessões com JWT e expiração automática','Multi-tenant: cada usuário vê apenas seus dados'].map((f, i) => (
                <div key={i} className="cf-feature"><div className="cf-feature-dot" />{f}</div>
              ))}
            </div>
            <div className="cf-panel-glow" aria-hidden="true" />
          </div>
          <div className="cf-panel-right">
            <div className="cf-form-heading">
              <h2 className="cf-form-title">ENTRAR</h2>
              <p className="cf-form-sub">Bem-vindo de volta ao CosmoFlux</p>
            </div>
            {error && <div className="cf-error">⚠ {error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="cf-field">
                <label htmlFor="email" className="cf-label">Email</label>
                <input id="email" type="email" className="cf-input"
                  placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="cf-field">
                <label htmlFor="password" className="cf-label">Senha</label>
                <input id="password" type="password" className="cf-input"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="cf-options">
                <label className="cf-remember">
                  <input type="checkbox" className="cf-checkbox"
                    checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  Lembrar de mim
                </label>
              </div>
              <button type="submit" className="cf-submit" disabled={isLoading}>
                {isLoading ? <span className="cf-spinner" /> : 'ENTRAR'}
              </button>
            </form>
            <p className="cf-footer">CosmoFlux © {new Date().getFullYear()} · Sistema de Gestão</p>
          </div>
        </div>
      </div>
    </>
  );
}