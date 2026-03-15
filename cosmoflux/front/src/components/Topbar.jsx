const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .topbar {
    height: 60px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center;
    padding: 0 24px; gap: 12px;
    background: #0e1013;
    flex-shrink: 0;
    font-family: 'Syne', sans-serif;
  }

  .tb-toggle {
    display: none;
    background: none; border: none;
    color: rgba(232,234,237,0.5); cursor: pointer; padding: 6px;
    border-radius: 6px; transition: background 0.15s; align-items: center;
  }
  .tb-toggle:hover { background: rgba(255,255,255,0.06); }

  .tb-info { flex: 1; min-width: 0; }
  .tb-title { font-size: 16px; font-weight: 700; color: #e8eaed; }
  .tb-sub { font-size: 11px; color: rgba(232,234,237,0.28); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }

  .tb-search {
    display: flex; align-items: center; gap: 7px;
    background: #13161a; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; padding: 7px 12px; transition: border-color 0.2s;
  }
  .tb-search:focus-within { border-color: rgba(255,255,255,0.12); }
  .tb-search input {
    background: none; border: none; outline: none;
    font-size: 13px; color: #e8eaed; font-family: 'Syne', sans-serif; width: 180px;
  }
  .tb-search input::placeholder { color: rgba(232,234,237,0.28); }

  .tb-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 7px; border: none;
    font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
    background: #00d4aa; color: #000;
  }
  .tb-btn:hover { background: #00efc0; transform: translateY(-1px); }
  .tb-btn-label {}

  @media (max-width: 900px) {
    .tb-search { display: none; }
  }
  @media (max-width: 768px) {
    .tb-toggle { display: flex !important; }
    .topbar { padding: 0 16px; }
  }
  @media (max-width: 480px) {
    .tb-btn-label { display: none; }
  }
`;

export default function Topbar({ title, onMenuToggle, onNewProduct }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <>
      <style>{styles}</style>
      <header className="topbar">

        <button className="tb-toggle" onClick={onMenuToggle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="tb-info">
          <div className="tb-title">{title}</div>
          <div className="tb-sub">{today}</div>
        </div>

        <div className="tb-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'rgba(232,234,237,0.28)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Buscar produto, pedido..." />
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