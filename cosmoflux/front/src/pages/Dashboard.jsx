import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getKPIs, getVendasPorMes, getProdutos,
  getAlertasEstoque, getMovimentacoes, getPedidos
} from '../services/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .dash-content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: 'Syne', sans-serif;
  }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .kpi {
    background: #0e1013; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 11px; padding: 18px; position: relative;
    overflow: hidden; transition: border-color 0.2s, transform 0.2s;
    animation: up 0.4s cubic-bezier(.22,1,.36,1) both;
  }
  .kpi:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
  .kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: var(--c, #00d4aa);
  }
  .kpi-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: rgba(232,234,237,0.28);
    font-family: 'JetBrains Mono', monospace; margin-bottom: 8px;
  }
  .kpi-value { font-size: 22px; font-weight: 800; color: #e8eaed; line-height: 1; margin-bottom: 7px; font-family: 'JetBrains Mono', monospace; }
  .kpi-delta { font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 3px; color: #ff4757; }
  .kpi-icon {
    position: absolute; top: 16px; right: 16px;
    width: 32px; height: 32px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04); font-size: 14px;
  }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid3 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }

  .card {
    background: #0e1013; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 11px; overflow: hidden;
    animation: up 0.5s cubic-bezier(.22,1,.36,1) both;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .card-title { font-size: 13px; font-weight: 700; color: #e8eaed; }
  .card-sub { font-size: 10px; color: rgba(232,234,237,0.28); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

  .tbl { width: 100%; border-collapse: collapse; }
  .tbl th {
    text-align: left; padding: 9px 18px;
    font-size: 9px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(232,234,237,0.28);
    font-family: 'JetBrains Mono', monospace;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .tbl td {
    padding: 11px 18px; font-size: 12px; color: rgba(232,234,237,0.5);
    border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.15s;
  }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: rgba(255,255,255,0.02); color: #e8eaed; }
  .tbl td:first-child { color: #e8eaed; font-weight: 500; }

  .badge {
    display: inline-flex; align-items: center;
    padding: 2px 7px; border-radius: 4px;
    font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
  }
  .b-green  { background: rgba(0,212,170,0.12);  color: #00d4aa; }
  .b-red    { background: rgba(255,71,87,0.12);   color: #ff4757; }
  .b-blue   { background: rgba(0,153,255,0.12);   color: #0099ff; }
  .b-orange { background: rgba(255,107,53,0.12);  color: #ff6b35; }
  .b-yellow { background: rgba(255,211,42,0.12);  color: #ffd32a; }

  .bars { display: flex; align-items: flex-end; gap: 5px; height: 90px; padding: 16px 18px 10px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .bar {
    width: 100%; border-radius: 3px 3px 0 0;
    background: rgba(255,255,255,0.07);
    transition: height 0.6s cubic-bezier(.22,1,.36,1), background 0.2s; min-height: 3px;
  }
  .bar:hover { background: #00d4aa !important; }
  .bar-lbl { font-size: 9px; color: rgba(232,234,237,0.28); font-family: 'JetBrains Mono', monospace; }

  .alert-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 18px; border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: background 0.15s;
  }
  .alert-item:last-child { border-bottom: none; }
  .alert-item:hover { background: rgba(255,255,255,0.02); }
  .alert-name { flex: 1; font-size: 12px; color: #e8eaed; font-weight: 500; }
  .alert-stock { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: rgba(232,234,237,0.28); }

  .act-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 18px; transition: background 0.15s;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .act-item:last-child { border-bottom: none; }
  .act-item:hover { background: rgba(255,255,255,0.02); }
  .act-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .act-text { font-size: 12px; color: rgba(232,234,237,0.5); line-height: 1.5; }
  .act-text strong { color: #e8eaed; font-weight: 600; }
  .act-meta { display: flex; gap: 8px; margin-top: 3px; align-items: center; flex-wrap: wrap; }
  .act-meta span { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: rgba(232,234,237,0.28); }

  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px;
  }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  .empty { padding: 28px; text-align: center; color: rgba(232,234,237,0.28); font-size: 12px; font-family: 'JetBrains Mono', monospace; }

  .btn-sm {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);
    font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
    background: rgba(255,255,255,0.05); color: rgba(232,234,237,0.5);
  }
  .btn-sm:hover { background: rgba(255,255,255,0.08); color: #e8eaed; }

  @keyframes up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 900px)  { .grid2, .grid3 { grid-template-columns: 1fr; } }
  @media (max-width: 768px)  { .dash-content { padding: 16px; gap: 14px; } .kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
  @media (max-width: 480px)  { .kpis { grid-template-columns: 1fr; } }
`;

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const StatusBadge = ({ s }) => {
  const map = {
    ok:         <span className="badge b-green">OK</span>,
    critico:    <span className="badge b-orange">BAIXO</span>,
    esgotado:   <span className="badge b-red">ESGOTADO</span>,
    pendente:   <span className="badge b-yellow">PENDENTE</span>,
    confirmado: <span className="badge b-blue">CONFIRMADO</span>,
    entregue:   <span className="badge b-green">ENTREGUE</span>,
    cancelado:  <span className="badge b-red">CANCELADO</span>,
  };
  return map[s] || <span className="badge b-blue">{s}</span>;
};

const SkeletonRows = ({ n = 4 }) => (
  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 36, animationDelay: `${i * 0.1}s` }} />
    ))}
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();

  const [kpis,     setKpis]     = useState(null);
  const [vendas,   setVendas]   = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [alertas,  setAlertas]  = useState([]);
  const [movs,     setMovs]     = useState([]);
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [k, v, p, a, m, ped] = await Promise.allSettled([
          getKPIs(), getVendasPorMes(), getProdutos(),
          getAlertasEstoque(), getMovimentacoes(), getPedidos()
        ]);
        if (k.status   === 'fulfilled') setKpis(k.value);
        if (v.status   === 'fulfilled') setVendas(v.value);
        if (p.status   === 'fulfilled') setProdutos(p.value);
        if (a.status   === 'fulfilled') setAlertas(a.value);
        if (m.status   === 'fulfilled') setMovs(m.value);
        if (ped.status === 'fulfilled') setPedidos(ped.value);
      } catch {
        setError('Erro ao carregar dados. Verifique se o backend está rodando.');
      } finally { setLoading(false); }
    })();
  }, []);

  const maxVenda = Math.max(...vendas.map(v => v.total), 1);

  return (
    <>
      <style>{styles}</style>
      <div className="dash-content">

        {error && (
          <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#ff4757', fontFamily: 'JetBrains Mono, monospace' }}>
            ⚠ {error}
          </div>
        )}

        {/* KPIs */}
        <div className="kpis">
          {[
            { label: 'Receita do Mês',  value: fmtBRL(kpis?.receita_mes),           icon: '₿', color: '#00d4aa',  delay: '0s' },
            { label: 'Pedidos Hoje',    value: String(kpis?.pedidos_hoje ?? '—'),    icon: '◻', color: '#0099ff', delay: '0.06s' },
            { label: 'Produtos Ativos', value: String(kpis?.total_produtos ?? '—'), icon: '◈', color: '#ff6b35', delay: '0.12s' },
            { label: 'Lucro do Mês',    value: fmtBRL(kpis?.lucro_mes),             icon: '◎', color: '#a855f7', delay: '0.18s' },
          ].map(k => (
            <div key={k.label} className="kpi" style={{ '--c': k.color, animationDelay: k.delay }}>
              <div className="kpi-icon">{k.icon}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">
                {loading ? <div className="skeleton" style={{ height: 20, width: 90 }} /> : k.value}
              </div>
              {!loading && kpis?.estoque_critico > 0 && k.label === 'Produtos Ativos' && (
                <div className="kpi-delta">▼ {kpis.estoque_critico} críticos</div>
              )}
            </div>
          ))}
        </div>

        {/* Gráfico + Alertas */}
        <div className="grid3">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Pedidos por Mês</div>
                <div className="card-sub">{new Date().getFullYear()}</div>
              </div>
            </div>
            {loading ? <SkeletonRows n={1} /> : (
              <>
                <div className="bars">
                  {vendas.map((v, i) => (
                    <div key={i} className="bar-col">
                      <div className="bar" style={{
                        height: `${(v.total / maxVenda) * 100}%`,
                        background: i === new Date().getMonth() ? 'rgba(0,212,170,0.45)' : undefined,
                      }} />
                      <div className="bar-lbl">{MESES[i]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0 18px 14px', display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(232,234,237,0.28)', fontFamily: 'JetBrains Mono, monospace' }}>TOTAL ANO</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#00d4aa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {vendas.reduce((a, v) => a + v.total, 0)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Alerta de Estoque</div>
                <div className="card-sub">{alertas.length} crítico(s)</div>
              </div>
            </div>
            {loading ? <SkeletonRows n={3} /> : alertas.length === 0 ? (
              <div className="empty">✓ Estoque em ordem</div>
            ) : alertas.map((a, i) => (
              <div key={i} className="alert-item">
                <span className={`badge ${a.status === 'esgotado' ? 'b-red' : 'b-orange'}`}>
                  {a.status === 'esgotado' ? 'ESGOTADO' : 'BAIXO'}
                </span>
                <span className="alert-name">{a.nome}</span>
                <span className="alert-stock">{a.estoque_atual}/{a.estoque_minimo}</span>
              </div>
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button className="btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/estoque')}>
                Ver Estoque
              </button>
            </div>
          </div>
        </div>

        {/* Produtos + Lateral */}
        <div className="grid2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Produtos</div>
                <div className="card-sub">{produtos.length} cadastrados</div>
              </div>
              <button className="btn-sm" onClick={() => navigate('/produtos')}>Ver todos</button>
            </div>
            {loading ? <SkeletonRows n={5} /> : produtos.length === 0 ? (
              <div className="empty">Nenhum produto cadastrado</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Produto</th><th>Estoque</th><th>Preço</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {produtos.slice(0, 6).map((p, i) => (
                    <tr key={i}>
                      <td>
                        <div>{p.nome}</div>
                        {p.categoria && <div style={{ fontSize: 10, color: 'rgba(232,234,237,0.28)', fontFamily: 'JetBrains Mono, monospace' }}>{p.categoria}</div>}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.estoque_atual} {p.unidade}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{fmtBRL(p.preco_venda)}</td>
                      <td><StatusBadge s={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Pedidos recentes */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Pedidos Recentes</div>
                <button className="btn-sm" onClick={() => navigate('/pedidos')}>Ver mais</button>
              </div>
              {loading ? <SkeletonRows n={3} /> : pedidos.length === 0 ? (
                <div className="empty">Nenhum pedido</div>
              ) : pedidos.slice(0, 4).map((p, i) => (
                <div key={i} className="act-item">
                  <div className="act-dot" style={{
                    background: p.status === 'entregue' ? '#00d4aa' : p.status === 'cancelado' ? '#ff4757' : '#0099ff'
                  }} />
                  <div>
                    <div className="act-text"><strong>#{p.id}</strong> — {p.cliente}</div>
                    <div className="act-meta">
                      <StatusBadge s={p.status} />
                      <span style={{ color: '#00d4aa' }}>{fmtBRL(p.total)}</span>
                      <span>{p.data}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Movimentações */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Movimentações</div>
                <button className="btn-sm" onClick={() => navigate('/entradas')}>Ver mais</button>
              </div>
              {loading ? <SkeletonRows n={3} /> : movs.length === 0 ? (
                <div className="empty">Sem movimentações</div>
              ) : movs.slice(0, 5).map((m, i) => (
                <div key={i} className="act-item">
                  <div className="act-dot" style={{ background: m.tipo === 'entrada' ? '#00d4aa' : '#ff6b35' }} />
                  <div>
                    <div className="act-text"><strong>{m.tipo.toUpperCase()}</strong> — {m.produto}</div>
                    <div className="act-meta">
                      <span style={{ color: m.tipo === 'entrada' ? '#00d4aa' : '#ff6b35' }}>
                        {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un
                      </span>
                      {m.motivo && <span>{m.motivo}</span>}
                      <span>{m.data}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}