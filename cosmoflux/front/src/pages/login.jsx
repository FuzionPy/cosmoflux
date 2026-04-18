import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .cf-root {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(ellipse at top, #0a0815 0%, #04050a 60%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif;
    overflow: auto;
    padding: 20px;
    z-index: 1;
  }

  /* ── Background atmospheric ── */
  .cf-bg-glow {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(circle 400px at 20% 30%, rgba(124,58,237,0.12) 0%, transparent 60%),
      radial-gradient(circle 500px at 80% 70%, rgba(14,165,233,0.10) 0%, transparent 60%),
      radial-gradient(circle 300px at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 60%);
  }

  .cf-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .cf-star {
    position: absolute; border-radius: 50%; background: white;
    animation: twinkle var(--dur, 3s) ease-in-out infinite var(--delay, 0s);
  }
  @keyframes twinkle {
    0%, 100% { opacity: var(--min-op, 0.1); transform: scale(1); }
    50% { opacity: var(--max-op, 0.8); transform: scale(1.3); }
  }

  /* Grid sutil de fundo */
  .cf-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
  }

  /* ── Card principal ── */
  .cf-card {
    position: relative; z-index: 1;
    width: 100%; max-width: 480px;
    background: linear-gradient(180deg, rgba(14,16,22,0.95) 0%, rgba(10,12,18,0.95) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 52px 52px 44px;
    box-shadow:
      0 40px 80px rgba(0,0,0,0.5),
      0 0 0 1px rgba(124,58,237,0.08),
      inset 0 1px 0 rgba(255,255,255,0.04);
    animation: cardIn 0.7s cubic-bezier(.22,1,.36,1) both;
    backdrop-filter: blur(20px);
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Glow decorativo no topo do card */
  .cf-card::before {
    content: '';
    position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(160,112,255,0.6), transparent);
  }

  /* ── Logo ── */
  .cf-brand {
    display: flex; flex-direction: column; align-items: center;
    margin-bottom: 36px;
    animation: fadeDown 0.8s cubic-bezier(.22,1,.36,1) 0.1s both;
  }
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: none; }
  }

  .cf-logo {
    width: 56px; height: 56px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #a070ff, #5e2cb4 70%);
    display: flex; align-items: center; justify-content: center;
    position: relative; margin-bottom: 16px;
    box-shadow:
      0 0 0 1px rgba(160,112,255,0.3),
      0 0 40px rgba(160,112,255,0.3),
      inset 0 2px 4px rgba(255,255,255,0.15);
  }
  .cf-logo::before {
    content: ''; position: absolute; inset: -10px;
    border: 1px solid rgba(160,112,255,0.2); border-radius: 50%;
    animation: orbit 6s linear infinite;
  }
  .cf-logo::after {
    content: ''; position: absolute; inset: -20px;
    border: 1px dashed rgba(160,112,255,0.12); border-radius: 50%;
    animation: orbit 18s linear infinite reverse;
  }
  @keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .cf-brand-name {
    font-family: 'Space Mono', monospace;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.3em; color: rgba(255,255,255,0.9);
    text-transform: uppercase;
  }
  .cf-brand-tagline {
    font-size: 11px; color: rgba(255,255,255,0.35);
    margin-top: 6px; letter-spacing: 0.05em;
  }

  /* ── Divisor ornamental ── */
  .cf-divider {
    display: flex; align-items: center; gap: 10px;
    margin: 0 auto 32px; max-width: 200px;
    animation: fadeIn 0.8s ease 0.2s both;
  }
  .cf-divider-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  }
  .cf-divider-dot {
    width: 4px; height: 4px; border-radius: 50%;
    background: rgba(160,112,255,0.5);
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* ── Form ── */
  .cf-form {
    animation: fadeUp 0.8s cubic-bezier(.22,1,.36,1) 0.25s both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }

  .cf-error {
    background: rgba(220,38,38,0.1);
    border: 1px solid rgba(220,38,38,0.25);
    border-radius: 10px; padding: 11px 14px;
    font-size: 12px; color: #fca5a5; margin-bottom: 18px;
    display: flex; align-items: center; gap: 8px;
    font-family: 'Space Mono', monospace;
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }
  @keyframes shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-3px); }
    40%, 60% { transform: translateX(3px); }
  }

  .cf-field { margin-bottom: 18px; }
  .cf-label {
    display: block; font-size: 10px; font-weight: 600;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: rgba(255,255,255,0.35); margin-bottom: 8px;
    font-family: 'Space Mono', monospace;
  }

  .cf-input-wrap {
    position: relative;
    display: flex; align-items: center;
  }
  .cf-input {
    width: 100%; padding: 13px 16px 13px 42px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; color: #fff; font-size: 14px;
    font-family: 'Outfit', sans-serif; outline: none;
    transition: all 0.2s;
  }
  .cf-input::placeholder { color: rgba(255,255,255,0.2); }
  .cf-input:focus {
    border-color: rgba(160,112,255,0.45);
    background: rgba(255,255,255,0.05);
    box-shadow: 0 0 0 3px rgba(160,112,255,0.1);
  }
  .cf-input-icon {
    position: absolute; left: 14px;
    color: rgba(255,255,255,0.3);
    display: flex; transition: color 0.2s;
    pointer-events: none;
  }
  .cf-input:focus + .cf-input-icon,
  .cf-input-wrap:focus-within .cf-input-icon {
    color: rgba(160,112,255,0.7);
  }

  .cf-options {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px;
  }
  .cf-remember {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: rgba(255,255,255,0.5); cursor: pointer;
    user-select: none;
  }
  .cf-checkbox {
    accent-color: #a070ff; width: 14px; height: 14px;
    cursor: pointer;
  }

  .cf-submit {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: none; border-radius: 10px;
    color: #fff; font-size: 13px; font-weight: 600;
    font-family: 'Space Mono', monospace; letter-spacing: 0.2em;
    cursor: pointer; transition: all 0.25s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    text-transform: uppercase;
    position: relative; overflow: hidden;
    box-shadow:
      0 4px 14px rgba(124,58,237,0.35),
      inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .cf-submit::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
  }
  .cf-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 8px 24px rgba(124,58,237,0.5),
      inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .cf-submit:hover:not(:disabled)::before { transform: translateX(100%); }
  .cf-submit:active:not(:disabled) { transform: translateY(0); }
  .cf-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .cf-spinner {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer ── */
  .cf-foot {
    margin-top: 28px; padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.05);
    text-align: center;
    animation: fadeIn 0.8s ease 0.4s both;
  }
  .cf-foot-text {
    font-size: 11px; color: rgba(255,255,255,0.25);
    font-family: 'Space Mono', monospace;
    letter-spacing: 0.1em;
  }
  .cf-foot-badges {
    display: flex; align-items: center; justify-content: center;
    gap: 14px; margin-top: 12px; flex-wrap: wrap;
  }
  .cf-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; color: rgba(255,255,255,0.3);
    font-family: 'Space Mono', monospace;
  }
  .cf-badge-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #00d4aa; box-shadow: 0 0 6px rgba(0,212,170,0.5);
  }

  @media (max-width: 520px) {
    .cf-card { padding: 40px 28px 32px; border-radius: 16px; }
    .cf-brand { margin-bottom: 28px; }
  }
`;

const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${Math.random()*100}%`,
  left: `${Math.random()*100}%`,
  size: Math.random()*2 + 0.5,
  dur: `${Math.random()*4 + 2}s`,
  delay: `${Math.random()*4}s`,
  minOp: (Math.random()*0.1 + 0.05).toFixed(2),
  maxOp: (Math.random()*0.5 + 0.25).toFixed(2),
}));

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
        <div className="cf-grid" />
        <div className="cf-bg-glow" />
        <div className="cf-stars" aria-hidden="true">
          {STARS.map(s => (
            <div key={s.id} className="cf-star" style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              '--dur': s.dur, '--delay': s.delay,
              '--min-op': s.minOp, '--max-op': s.maxOp,
            }} />
          ))}
        </div>

        <div className="cf-card">
          {/* Brand */}
          <div className="cf-brand">
            <div className="cf-logo" />
            <div className="cf-brand-name">Cosmo Flux</div>
            <div className="cf-brand-tagline">Sistema de Gestão</div>
          </div>

          <div className="cf-divider">
            <div className="cf-divider-line" />
            <div className="cf-divider-dot" />
            <div className="cf-divider-line" />
          </div>

          {/* Form */}
          <form className="cf-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="cf-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="cf-field">
              <label htmlFor="email" className="cf-label">Email</label>
              <div className="cf-input-wrap">
                <input id="email" type="email" className="cf-input"
                  placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <span className="cf-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
              </div>
            </div>

            <div className="cf-field">
              <label htmlFor="password" className="cf-label">Senha</label>
              <div className="cf-input-wrap">
                <input id="password" type="password" className="cf-input"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <span className="cf-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
              </div>
            </div>

            <div className="cf-options">
              <label className="cf-remember">
                <input type="checkbox" className="cf-checkbox"
                  checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                Lembrar de mim
              </label>
            </div>

            <button type="submit" className="cf-submit" disabled={isLoading}>
              {isLoading ? <span className="cf-spinner" /> : (
                <>
                  <span>Entrar</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="cf-foot">
            <div className="cf-foot-text">© {new Date().getFullYear()} CosmoFlux</div>
            <div className="cf-foot-badges">
              <div className="cf-badge"><div className="cf-badge-dot" />Argon2</div>
              <div className="cf-badge"><div className="cf-badge-dot" />JWT</div>
              <div className="cf-badge"><div className="cf-badge-dot" />Multi-tenant</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}