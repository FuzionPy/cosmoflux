import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const apig = url => fetch(BASE+url,{headers:h()}).then(r=>r.json());

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .topbar {
    height: 60px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px; gap: 12px;
    background: var(--surface); flex-shrink: 0; font-family: 'Plus Jakarta Sans', sans-serif;
    position: relative; z-index: 100;
  }
  .tb-toggle {
    display: none; background: none; border: none;
    color: var(--text-dim); cursor: pointer; padding: 6px;
    border-radius: 6px; transition: background 0.15s; align-items: center;
  }
  .tb-toggle:hover { background: var(--track); }
  .tb-theme-wrap { position: relative; flex-shrink: 0; }
  .tb-theme-btn {
    width: 36px; height: 36px; border-radius: 9px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; padding: 0;
  }
  .tb-theme-btn svg { display: block; color: var(--text); stroke: currentColor; }
  .tb-theme-btn:hover { border-color: var(--border2); background: var(--track); }
  .tb-theme-btn:hover svg { color: #00d4aa; }
  .tb-theme-menu {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 10px; padding: 5px; min-width: 168px; z-index: 200;
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
    display: flex; flex-direction: column; gap: 2px;
  }
  .tb-theme-opt {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 11px; border-radius: 7px; cursor: pointer;
    font-size: 13px; font-weight: 500; color: var(--text-dim);
    background: none; border: none; width: 100%; text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif; transition: all .15s;
  }
  .tb-theme-opt:hover { background: var(--track); color: var(--text); }
  .tb-theme-opt.active { background: rgba(0,212,170,.1); color: #00d4aa; }
  .tb-theme-opt .tb-opt-check { margin-left: auto; opacity: 0; }
  .tb-theme-opt.active .tb-opt-check { opacity: 1; }
  .tb-logo {
    display: flex; align-items: center; gap: 13px; flex-shrink: 0; padding-left: 6px;
  }
  .tb-logo-sphere {
    width: 30px; height: 30px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #a070ff, #5e2cb4 70%);
    position: relative; flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(160,112,255,0.3), 0 0 14px rgba(160,112,255,0.3),
                inset 0 2px 4px rgba(255,255,255,0.15);
  }
  .tb-logo-sphere::before {
    content: ''; position: absolute; inset: -6px;
    border: 1px solid rgba(160,112,255,0.25); border-radius: 50%;
    animation: tb-orbit 6s linear infinite;
  }
  .tb-logo-sphere::after {
    content: ''; position: absolute; inset: -12px;
    border: 1px dashed rgba(160,112,255,0.12); border-radius: 50%;
    animation: tb-orbit 18s linear infinite reverse;
  }
  @keyframes tb-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .tb-logo-name {
    font-size: 13px; font-weight: 800; letter-spacing: 0.04em; color: var(--text);
    white-space: nowrap;
  }
  .tb-logo-divider { width: 1px; height: 26px; background: var(--border2); flex-shrink: 0; margin: 0 4px; }
  @media (max-width: 768px) { .tb-logo-name { display: none; } .tb-logo-divider { display: none; } }

  .tb-info { flex: 1; min-width: 0; }
  .tb-title { font-size: 16px; font-weight: 700; color: var(--text); }
  .tb-sub { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }

  .tb-search-wrap { position: relative; }
  .tb-search {
    display: flex; align-items: center; gap: 7px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 7px; padding: 7px 12px; transition: border-color 0.2s;
  }
  .tb-search.open { border-color: rgba(0,212,170,0.4); box-shadow: 0 0 0 3px rgba(0,212,170,0.08); }
  .tb-search input {
    background: none; border: none; outline: none;
    font-size: 13px; color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; width: 200px;
  }
  .tb-search input::placeholder { color: var(--text-muted); }

  .tb-search-kbd {
    font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text-muted);
    background:var(--track);border:1px solid var(--border2);
    border-radius:4px;padding:1px 5px;white-space:nowrap;
  }

  /* Dropdown */
  .gs-drop {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 400px; background: var(--surface);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    overflow: hidden; animation: gsIn .2s cubic-bezier(.22,1,.36,1) both;
    max-height: 480px; overflow-y: auto;
  }
  .gs-drop::-webkit-scrollbar{width:4px;}
  .gs-drop::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}
  @keyframes gsIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }

  .gs-section { padding: 8px 0; }
  .gs-section-title {
    padding: 6px 16px 4px; font-size:9px; font-weight:700; letter-spacing:.12em;
    text-transform:uppercase; color:var(--text-muted);
    font-family:'JetBrains Mono',monospace;
  }
  .gs-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; cursor: pointer; transition: background .1s;
    border-left: 2px solid transparent;
  }
  .gs-item:hover { background: rgba(255,255,255,.04); border-left-color: #00d4aa; }
  .gs-item-icon {
    width: 32px; height: 32px; border-radius: 8px; display:flex;
    align-items:center; justify-content:center; font-size:14px; flex-shrink:0;
  }
  .gs-item-body { flex:1; min-width:0; }
  .gs-item-name { font-size:13px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .gs-item-sub { font-size:11px; color:rgba(232,234,237,.35); font-family:'JetBrains Mono',monospace; margin-top:2px; }
  .gs-item-right { font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; color:#00d4aa; white-space:nowrap; }

  .gs-empty { padding: 32px 16px; text-align:center; color:var(--text-muted); font-size:13px; }
  .gs-loading { padding: 24px 16px; text-align:center; color:var(--text-muted); font-size:12px; font-family:'JetBrains Mono',monospace; }
  .gs-divider { height:1px; background:var(--track); margin:0 16px; }

  .tb-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 7px; border: none;
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
    background: #00d4aa; color: #000;
  }
  .tb-btn:hover { background: #00efc0; transform: translateY(-1px); }

  @media (max-width: 900px) { .tb-search-wrap { display: none; } }
  @media (max-width: 768px) { .tb-toggle { display: flex !important; } .topbar { padding: 0 16px; } }
  @media (max-width: 480px) { .tb-btn-label { display: none; } }
`;

export default function Topbar({ title, onMenuToggle, actionLabel, onAction, themePref = "system", resolvedTheme = "dark", onSetTheme }) {
  const [themeMenu, setThemeMenu] = useState(false);
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState({ produtos:[], clientes:[], vendas:[] });
  const wrapRef = useRef(null);
  const debounce = useRef(null);

  const today = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });

  const buscar = useCallback(async q => {
    if (!q || q.length < 2) { setResults({ produtos:[], clientes:[], vendas:[] }); return; }
    setLoading(true);
    try {
      const [prod, cli, ped] = await Promise.allSettled([
        apig('/produtos'), apig('/clientes'), apig('/pedidos?limite=200'),
      ]);
      const ql = q.toLowerCase();
      setResults({
        produtos: prod.status==='fulfilled'
          ? prod.value.filter(p => p.nome?.toLowerCase().includes(ql) || (p.sku||'').toLowerCase().includes(ql)).slice(0,4)
          : [],
        clientes: cli.status==='fulfilled'
          ? cli.value.filter(c => c.nome?.toLowerCase().includes(ql) || (c.telefone||'').includes(ql)).slice(0,3)
          : [],
        vendas: ped.status==='fulfilled'
          ? ped.value.filter(p => (p.cliente||'').toLowerCase().includes(ql) || String(p.id).includes(ql)).slice(0,3)
          : [],
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => buscar(query), 300);
    return () => clearTimeout(debounce.current);
  }, [query, buscar]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ir = path => { setOpen(false); setQuery(''); navigate(path); };

  const total = results.produtos.length + results.clientes.length + results.vendas.length;

  return (
    <>
      <style>{styles}</style>
      <header className="topbar">
        <button className="tb-toggle" onClick={onMenuToggle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="tb-logo">
          <div className="tb-logo-sphere" />
          <span className="tb-logo-name">CosmoFlux</span>
        </div>
        <div className="tb-logo-divider" />

        <div className="tb-info">
          <div className="tb-title">{title}</div>
          <div className="tb-sub">{today}</div>
        </div>

        <div className="tb-search-wrap" ref={wrapRef}>
          <div className={`tb-search${open?' open':''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Buscar produto, cliente, venda..."
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
            {query && <button onClick={()=>{setQuery('');setResults({produtos:[],clientes:[],vendas:[]});}} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>}
            {!query && <span className="tb-search-kbd">⌘K</span>}
          </div>

          {open && query.length >= 2 && (
            <div className="gs-drop">
              {loading ? (
                <div className="gs-loading">Buscando...</div>
              ) : total === 0 ? (
                <div className="gs-empty">Nenhum resultado para "{query}"</div>
              ) : (
                <>
                  {results.produtos.length > 0 && (
                    <div className="gs-section">
                      <div className="gs-section-title">Produtos</div>
                      {results.produtos.map(p => (
                        <div key={p.id} className="gs-item" onClick={()=>ir('/produtos')}>
                          <div className="gs-item-icon" style={{background:'rgba(0,212,170,.08)'}}>◈</div>
                          <div className="gs-item-body">
                            <div className="gs-item-name">{p.nome}</div>
                            <div className="gs-item-sub">estoque: {p.estoque_atual} {p.unidade}{p.sku?` · SKU: ${p.sku}`:''}</div>
                          </div>
                          <div className="gs-item-right">{fmtBRL(p.preco_venda)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results.produtos.length>0 && results.clientes.length>0 && <div className="gs-divider"/>}

                  {results.clientes.length > 0 && (
                    <div className="gs-section">
                      <div className="gs-section-title">Clientes</div>
                      {results.clientes.map(c => (
                        <div key={c.id} className="gs-item" onClick={()=>ir('/clientes')}>
                          <div className="gs-item-icon" style={{background:'rgba(0,153,255,.08)',color:'#0099ff',fontSize:13,fontWeight:700,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
                            {c.nome?.[0]?.toUpperCase()}
                          </div>
                          <div className="gs-item-body">
                            <div className="gs-item-name">{c.nome}</div>
                            <div className="gs-item-sub">{c.telefone||'sem telefone'}{c.cidade?` · ${c.cidade}`:''}</div>
                          </div>
                          {c.total_em_aberto > 0 && <div className="gs-item-right" style={{color:'#ffd32a'}}>{fmtBRL(c.total_em_aberto)}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {(results.produtos.length>0||results.clientes.length>0) && results.vendas.length>0 && <div className="gs-divider"/>}

                  {results.vendas.length > 0 && (
                    <div className="gs-section">
                      <div className="gs-section-title">Vendas</div>
                      {results.vendas.map(p => (
                        <div key={p.id} className="gs-item" onClick={()=>ir('/vendas')}>
                          <div className="gs-item-icon" style={{background:'rgba(168,85,247,.08)',color:'#a855f7',fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>
                            #{p.id}
                          </div>
                          <div className="gs-item-body">
                            <div className="gs-item-name">{p.cliente||'Balcão'}</div>
                            <div className="gs-item-sub">{p.data} · {p.num_itens} item(s)</div>
                          </div>
                          <div className="gs-item-right">{fmtBRL(p.total)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="tb-theme-wrap">
          <button className="tb-theme-btn" onClick={() => setThemeMenu(o=>!o)} title="Tema">
            {resolvedTheme === 'light' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>
              </svg>
            )}
          </button>
          {themeMenu && (
            <>
              <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setThemeMenu(false)}/>
              <div className="tb-theme-menu">
                {[
                  { k:'light',  label:'Claro',  ic:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></> },
                  { k:'dark',   label:'Escuro', ic:<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/> },
                  { k:'system', label:'Sistema', ic:<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></> },
                ].map(o=>(
                  <button key={o.k} className={`tb-theme-opt${themePref===o.k?' active':''}`}
                    onClick={()=>{ onSetTheme(o.k); setThemeMenu(false); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{o.ic}</svg>
                    {o.label}
                    <svg className="tb-opt-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {actionLabel && onAction && (
          <button className="tb-btn" onClick={onAction}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="tb-btn-label">{actionLabel}</span>
          </button>
        )}
      </header>
    </>
  );
}