import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const apig = url => fetch(BASE+url,{headers:h()}).then(r=>r.json());

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .topbar {
    height: 60px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; padding: 0 24px; gap: 12px;
    background: #0e1013; flex-shrink: 0; font-family: 'Syne', sans-serif;
    position: relative; z-index: 100;
  }
  .tb-toggle {
    display: none; background: none; border: none;
    color: rgba(232,234,237,0.5); cursor: pointer; padding: 6px;
    border-radius: 6px; transition: background 0.15s; align-items: center;
  }
  .tb-toggle:hover { background: rgba(255,255,255,0.06); }
  .tb-info { flex: 1; min-width: 0; }
  .tb-title { font-size: 16px; font-weight: 700; color: #e8eaed; }
  .tb-sub { font-size: 11px; color: rgba(232,234,237,0.28); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }

  .tb-search-wrap { position: relative; }
  .tb-search {
    display: flex; align-items: center; gap: 7px;
    background: #13161a; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; padding: 7px 12px; transition: border-color 0.2s;
  }
  .tb-search.open { border-color: rgba(0,212,170,0.4); box-shadow: 0 0 0 3px rgba(0,212,170,0.08); }
  .tb-search input {
    background: none; border: none; outline: none;
    font-size: 13px; color: #e8eaed; font-family: 'Syne', sans-serif; width: 200px;
  }
  .tb-search input::placeholder { color: rgba(232,234,237,0.28); }

  .tb-search-kbd {
    font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.25);
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
    border-radius:4px;padding:1px 5px;white-space:nowrap;
  }

  /* Dropdown */
  .gs-drop {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 400px; background: #0e1013;
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
    text-transform:uppercase; color:rgba(232,234,237,.28);
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
  .gs-item-name { font-size:13px; font-weight:600; color:#e8eaed; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .gs-item-sub { font-size:11px; color:rgba(232,234,237,.35); font-family:'JetBrains Mono',monospace; margin-top:2px; }
  .gs-item-right { font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; color:#00d4aa; white-space:nowrap; }

  .gs-empty { padding: 32px 16px; text-align:center; color:rgba(232,234,237,.25); font-size:13px; }
  .gs-loading { padding: 24px 16px; text-align:center; color:rgba(232,234,237,.25); font-size:12px; font-family:'JetBrains Mono',monospace; }
  .gs-divider { height:1px; background:rgba(255,255,255,.05); margin:0 16px; }

  .tb-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 7px; border: none;
    font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
    background: #00d4aa; color: #000;
  }
  .tb-btn:hover { background: #00efc0; transform: translateY(-1px); }

  @media (max-width: 900px) { .tb-search-wrap { display: none; } }
  @media (max-width: 768px) { .tb-toggle { display: flex !important; } .topbar { padding: 0 16px; } }
  @media (max-width: 480px) { .tb-btn-label { display: none; } }
`;

export default function Topbar({ title, onMenuToggle, onNewProduct }) {
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
                          <div className="gs-item-icon" style={{background:'rgba(0,153,255,.08)',color:'#0099ff',fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif'}}>
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

        <button className="tb-btn" onClick={onNewProduct}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="tb-btn-label">Novo Produto</span>
        </button>
      </header>
    </>
  );
}