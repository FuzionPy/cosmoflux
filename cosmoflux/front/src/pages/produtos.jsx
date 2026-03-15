import { useState, useEffect } from 'react';
import { getProdutos, criarProduto, atualizarProduto, deletarProduto, getCategorias, getFornecedores } from '../services/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  .pag {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: 'Syne', sans-serif;
    color: #e8eaed;
    animation: fadeIn 0.3s ease both;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* ── HEADER ── */
  .pag-header {
    display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .pag-title { font-size: 22px; font-weight: 800; color: #e8eaed; }
  .pag-sub { font-size: 12px; color: rgba(232,234,237,0.35); font-family: 'JetBrains Mono', monospace; margin-top: 4px; }

  .hdr-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  /* ── SEARCH + FILTER BAR ── */
  .filter-bar {
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  }
  .search-field {
    display: flex; align-items: center; gap: 8px;
    background: #0e1013; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 9px 14px; flex: 1; min-width: 200px;
    transition: border-color 0.2s;
  }
  .search-field:focus-within { border-color: rgba(0,212,170,0.4); }
  .search-field input {
    background: none; border: none; outline: none;
    font-size: 13px; color: #e8eaed; font-family: 'Syne', sans-serif; width: 100%;
  }
  .search-field input::placeholder { color: rgba(232,234,237,0.25); }

  .filter-select {
    background: #0e1013; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 9px 14px;
    font-size: 13px; color: rgba(232,234,237,0.7);
    font-family: 'Syne', sans-serif; outline: none; cursor: pointer;
    transition: border-color 0.2s;
  }
  .filter-select:focus { border-color: rgba(0,212,170,0.4); }

  /* ── STATS ROW ── */
  .stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .stat-chip {
    background: #0e1013; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px; padding: 10px 16px;
    display: flex; align-items: center; gap: 10px;
    flex: 1; min-width: 140px;
  }
  .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .stat-val { font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #e8eaed; }
  .stat-lbl { font-size: 11px; color: rgba(232,234,237,0.35); margin-top: 1px; }

  /* ── GRID DE PRODUTOS ── */
  .prod-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .prod-card {
    background: #0e1013;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    animation: cardIn 0.4s cubic-bezier(.22,1,.36,1) both;
    cursor: pointer;
    position: relative;
  }
  .prod-card:hover {
    border-color: rgba(255,255,255,0.12);
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  .prod-card.selected {
    border-color: rgba(0,212,170,0.4);
    box-shadow: 0 0 0 1px rgba(0,212,170,0.2);
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .prod-card-top {
    padding: 18px 18px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    position: relative;
  }
  .prod-cat-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
    color: rgba(232,234,237,0.3); margin-bottom: 8px;
  }
  .prod-name {
    font-size: 15px; font-weight: 700; color: #e8eaed;
    line-height: 1.3; margin-bottom: 6px;
  }
  .prod-sku {
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    color: rgba(232,234,237,0.25);
  }
  .prod-status-dot {
    position: absolute; top: 18px; right: 18px;
    width: 8px; height: 8px; border-radius: 50%;
  }

  .prod-card-mid {
    padding: 14px 18px;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .prod-field-lbl {
    font-size: 9px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: rgba(232,234,237,0.28);
    font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;
  }
  .prod-field-val {
    font-size: 14px; font-weight: 700; color: #e8eaed;
    font-family: 'JetBrains Mono', monospace;
  }
  .prod-field-val.accent { color: #00d4aa; }
  .prod-field-val.muted  { color: rgba(232,234,237,0.45); font-size: 13px; }

  .prod-card-bot {
    padding: 12px 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .prod-stock-bar-wrap { flex: 1; }
  .prod-stock-label {
    display: flex; justify-content: space-between;
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    color: rgba(232,234,237,0.35); margin-bottom: 5px;
  }
  .prod-stock-track {
    height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;
  }
  .prod-stock-fill {
    height: 100%; border-radius: 2px;
    transition: width 0.8s cubic-bezier(.22,1,.36,1);
  }

  .prod-actions { display: flex; gap: 6px; }
  .icon-btn {
    width: 30px; height: 30px; border-radius: 6px; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; flex-shrink: 0;
    background: rgba(255,255,255,0.04); color: rgba(232,234,237,0.4);
  }
  .icon-btn:hover { background: rgba(255,255,255,0.1); color: #e8eaed; }
  .icon-btn.danger:hover { background: rgba(255,71,87,0.15); color: #ff4757; }

  /* ── BADGE ── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 2px 7px; border-radius: 4px;
    font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
  }
  .b-green  { background: rgba(0,212,170,0.12);  color: #00d4aa; }
  .b-red    { background: rgba(255,71,87,0.12);   color: #ff4757; }
  .b-orange { background: rgba(255,107,53,0.12);  color: #ff6b35; }

  /* ── EMPTY STATE ── */
  .empty-state {
    grid-column: 1 / -1;
    padding: 60px 20px; text-align: center;
    color: rgba(232,234,237,0.25);
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }
  .empty-text { font-size: 14px; margin-bottom: 6px; }
  .empty-sub  { font-size: 12px; font-family: 'JetBrains Mono', monospace; }

  /* ── SKELETON ── */
  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px;
  }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  /* ── MODAL ── */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease both;
  }
  .modal {
    background: #0e1013;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    width: 100%; max-width: 560px;
    max-height: 90vh; overflow-y: auto;
    animation: modalIn 0.3s cubic-bezier(.22,1,.36,1) both;
  }
  .modal::-webkit-scrollbar { width: 4px; }
  .modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    padding: 24px 24px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title { font-size: 16px; font-weight: 800; color: #e8eaed; }
  .modal-sub { font-size: 11px; color: rgba(232,234,237,0.35); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }
  .modal-close {
    width: 32px; height: 32px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.05); color: rgba(232,234,237,0.5);
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .modal-close:hover { background: rgba(255,71,87,0.15); color: #ff4757; }

  .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-field.full { grid-column: 1 / -1; }
  .form-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: rgba(232,234,237,0.35);
    font-family: 'JetBrains Mono', monospace;
  }
  .form-input, .form-select, .form-textarea {
    background: #13161a; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 10px 14px;
    font-size: 14px; color: #e8eaed;
    font-family: 'Syne', sans-serif; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  .form-input::placeholder { color: rgba(232,234,237,0.2); }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: rgba(0,212,170,0.4);
    box-shadow: 0 0 0 3px rgba(0,212,170,0.08);
  }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-select option { background: #0e1013; }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; gap: 10px; justify-content: flex-end;
  }

  /* ── BUTTONS ── */
  .btn {
    display: flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 8px; border: none;
    font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .btn-primary { background: #00d4aa; color: #000; }
  .btn-primary:hover { background: #00efc0; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: rgba(255,255,255,0.05); color: rgba(232,234,237,0.6);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #e8eaed; }
  .btn-danger { background: rgba(255,71,87,0.12); color: #ff4757; border: 1px solid rgba(255,71,87,0.2); }
  .btn-danger:hover { background: rgba(255,71,87,0.2); }

  /* ── DETAIL PANEL ── */
  .detail-panel {
    position: fixed; right: 0; top: 0; bottom: 0;
    width: 360px; background: #0e1013;
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 150; overflow-y: auto;
    animation: slideIn 0.3s cubic-bezier(.22,1,.36,1) both;
    display: flex; flex-direction: column;
  }
  .detail-panel::-webkit-scrollbar { width: 4px; }
  .detail-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .detail-header {
    padding: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    flex-shrink: 0;
  }
  .detail-name { font-size: 18px; font-weight: 800; color: #e8eaed; line-height: 1.3; }
  .detail-sku  { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: rgba(232,234,237,0.3); margin-top: 4px; }

  .detail-body { padding: 20px 24px; flex: 1; display: flex; flex-direction: column; gap: 20px; }

  .detail-section-title {
    font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(232,234,237,0.28);
    font-family: 'JetBrains Mono', monospace; margin-bottom: 12px;
  }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .detail-item {}
  .detail-item-lbl {
    font-size: 10px; color: rgba(232,234,237,0.28);
    font-family: 'JetBrains Mono', monospace; margin-bottom: 3px;
  }
  .detail-item-val { font-size: 15px; font-weight: 700; color: #e8eaed; }
  .detail-item-val.green { color: #00d4aa; }
  .detail-item-val.orange { color: #ff6b35; }
  .detail-item-val.red { color: #ff4757; }

  .detail-desc {
    font-size: 13px; color: rgba(232,234,237,0.5);
    line-height: 1.6; background: rgba(255,255,255,0.03);
    border-radius: 8px; padding: 12px;
  }

  .detail-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; gap: 10px; flex-shrink: 0;
  }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #0e1013; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; padding: 14px 18px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: #e8eaed; z-index: 300;
    animation: toastIn 0.3s cubic-bezier(.22,1,.36,1) both;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    min-width: 240px;
  }
  @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .toast-icon { font-size: 16px; }

  /* ── CONFIRM DIALOG ── */
  .confirm-dialog {
    background: #0e1013; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 24px; max-width: 360px; width: 100%;
    animation: modalIn 0.2s cubic-bezier(.22,1,.36,1) both;
  }
  .confirm-title { font-size: 16px; font-weight: 700; color: #e8eaed; margin-bottom: 8px; }
  .confirm-text { font-size: 13px; color: rgba(232,234,237,0.5); line-height: 1.6; margin-bottom: 20px; }
  .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .pag { padding: 16px; gap: 14px; }
    .form-row { grid-template-columns: 1fr; }
    .detail-panel { width: 100%; }
    .prod-grid { grid-template-columns: 1fr; }
    .stats-row { gap: 8px; }
  }
`;

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const stockColor = (atual, minimo) => {
  if (atual === 0) return '#ff4757';
  if (atual <= minimo) return '#ff6b35';
  return '#00d4aa';
};

const stockPct = (atual, minimo) => {
  const max = Math.max(minimo * 3, atual, 1);
  return Math.min((atual / max) * 100, 100);
};

const statusLabel = (p) => {
  if (p.estoque_atual === 0) return { text: 'ESGOTADO', cls: 'b-red', dot: '#ff4757' };
  if (p.estoque_atual <= p.estoque_minimo) return { text: 'BAIXO', cls: 'b-orange', dot: '#ff6b35' };
  return { text: 'OK', cls: 'b-green', dot: '#00d4aa' };
};

// ── FORM INICIAL ─────────────────────────────────────────────────────────────
const FORM_EMPTY = {
  nome: '', descricao: '', sku: '', unidade: 'un',
  preco_venda: '', preco_custo: '',
  estoque_atual: '', estoque_minimo: '5',
  categoria_id: '', fornecedor_id: '',
};

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function Produtos() {
  const [produtos,     setProdutos]     = useState([]);
  const [categorias,   setCategorias]   = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal,    setShowModal]    = useState(false);
  const [editingId,    setEditingId]    = useState(null); // null = novo, number = editando
  const [form,         setForm]         = useState(FORM_EMPTY);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');

  const [selected,     setSelected]     = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [toast,        setToast]        = useState(null);

  // Carrega dados
  const load = async () => {
    setLoading(true);
    try {
      const [p, c, f] = await Promise.allSettled([
        getProdutos(), getCategorias(), getFornecedores()
      ]);
      if (p.status === 'fulfilled') setProdutos(p.value);
      if (c.status === 'fulfilled') setCategorias(c.value);
      if (f.status === 'fulfilled') setFornecedores(f.value);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Toast helper
  const showToast = (msg, icon = '✓') => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  // Filtros
  const filtered = produtos.filter(p => {
    const matchSearch = !search ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.categoria || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.categoria === filterCat;
    const matchStatus = !filterStatus ||
      (filterStatus === 'ok'       && p.estoque_atual > p.estoque_minimo) ||
      (filterStatus === 'critico'  && p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo) ||
      (filterStatus === 'esgotado' && p.estoque_atual === 0);
    return matchSearch && matchCat && matchStatus;
  });

  // Stats
  const stats = {
    total:    produtos.length,
    ok:       produtos.filter(p => p.estoque_atual > p.estoque_minimo).length,
    critico:  produtos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length,
    esgotado: produtos.filter(p => p.estoque_atual === 0).length,
  };

  // Abrir modal para editar
  const openEdit = (p, e) => {
    e.stopPropagation();
    setEditingId(p.id);
    setForm({
      nome:           p.nome           || '',
      descricao:      p.descricao      || '',
      sku:            p.sku            || '',
      unidade:        p.unidade        || 'un',
      preco_venda:    p.preco_venda    || '',
      preco_custo:    p.preco_custo    || '',
      estoque_atual:  p.estoque_atual  ?? '',
      estoque_minimo: p.estoque_minimo ?? '5',
      categoria_id:   p.categoria_id   || '',
      fornecedor_id:  p.fornecedor_id  || '',
    });
    setFormError('');
    setShowModal(true);
  };

  // Salvar produto
  const handleSave = async () => {
    if (!form.nome || !form.preco_venda) {
      setFormError('Nome e preço de venda são obrigatórios.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const payload = {
        ...form,
        preco_venda:    parseFloat(form.preco_venda)  || 0,
        preco_custo:    parseFloat(form.preco_custo)  || 0,
        estoque_atual:  parseInt(form.estoque_atual)  || 0,
        estoque_minimo: parseInt(form.estoque_minimo) || 5,
        categoria_id:   form.categoria_id   ? parseInt(form.categoria_id)   : null,
        fornecedor_id:  form.fornecedor_id  ? parseInt(form.fornecedor_id)  : null,
      };
      if (editingId) {
        await atualizarProduto(editingId, payload);
        showToast('Produto atualizado com sucesso!', '✎');
      } else {
        await criarProduto(payload);
        showToast('Produto cadastrado com sucesso!');
      }
      setShowModal(false);
      setForm(FORM_EMPTY);
      setEditingId(null);
      load();
    } catch (e) {
      setFormError(e.message || 'Erro ao salvar produto.');
    } finally { setSaving(false); }
  };

  // Deletar produto
  const handleDelete = async (id) => {
    try {
      await deletarProduto(id);
      setConfirmDel(null);
      setSelected(null);
      showToast('Produto removido.', '🗑');
      load();
    } catch (e) {
      showToast('Erro ao remover produto.', '✕');
    }
  };

  const uniqueCats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  return (
    <>
      <style>{styles}</style>

      <div className="pag">

        {/* Header */}
        <div className="pag-header">
          <div>
            <div className="pag-title">Produtos</div>
            <div className="pag-sub">{produtos.length} produto(s) cadastrado(s)</div>
          </div>
          <div className="hdr-actions">
            <button className="btn btn-primary" onClick={() => { setForm(FORM_EMPTY); setFormError(''); setEditingId(null); setShowModal(true); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo Produto
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {[
            { label: 'Total', val: stats.total,    color: '#0099ff' },
            { label: 'Em estoque', val: stats.ok,  color: '#00d4aa' },
            { label: 'Estoque baixo', val: stats.critico,  color: '#ff6b35' },
            { label: 'Esgotados', val: stats.esgotado, color: '#ff4757' },
          ].map(s => (
            <div key={s.label} className="stat-chip">
              <div className="stat-dot" style={{ background: s.color }} />
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="filter-bar">
          <div className="search-field">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'rgba(232,234,237,0.28)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(232,234,237,0.3)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>
          <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas categorias</option>
            {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ok">Em estoque</option>
            <option value="critico">Estoque baixo</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </div>

        {/* Grid de produtos */}
        <div className="prod-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="prod-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                  <div className="skeleton" style={{ height: 18, width: '80%' }} />
                  <div className="skeleton" style={{ height: 10, width: '30%' }} />
                </div>
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="skeleton" style={{ height: 36 }} />
                  <div className="skeleton" style={{ height: 36 }} />
                  <div className="skeleton" style={{ height: 36 }} />
                  <div className="skeleton" style={{ height: 36 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◫</div>
              <div className="empty-text">Nenhum produto encontrado</div>
              <div className="empty-sub">{search ? 'Tente outro termo de busca' : 'Cadastre seu primeiro produto'}</div>
            </div>
          ) : (
            filtered.map((p, i) => {
              const st = statusLabel(p);
              const pct = stockPct(p.estoque_atual, p.estoque_minimo);
              const sColor = stockColor(p.estoque_atual, p.estoque_minimo);
              return (
                <div
                  key={p.id}
                  className={`prod-card${selected?.id === p.id ? ' selected' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                >
                  <div className="prod-card-top">
                    <div className="prod-status-dot" style={{ background: st.dot }} />
                    <div className="prod-cat-tag">{p.categoria || 'Sem categoria'}</div>
                    <div className="prod-name">{p.nome}</div>
                    {p.sku && <div className="prod-sku">SKU: {p.sku}</div>}
                  </div>

                  <div className="prod-card-mid">
                    <div>
                      <div className="prod-field-lbl">Preço de Venda</div>
                      <div className="prod-field-val accent">{fmtBRL(p.preco_venda)}</div>
                    </div>
                    <div>
                      <div className="prod-field-lbl">Custo</div>
                      <div className="prod-field-val muted">{fmtBRL(p.preco_custo)}</div>
                    </div>
                    <div>
                      <div className="prod-field-lbl">Margem</div>
                      <div className="prod-field-val" style={{ color: '#a855f7' }}>
                        {p.preco_custo > 0
                          ? `${(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100).toFixed(0)}%`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="prod-field-lbl">Fornecedor</div>
                      <div className="prod-field-val muted" style={{ fontSize: 11 }}>{p.fornecedor || '—'}</div>
                    </div>
                  </div>

                  <div className="prod-card-bot">
                    <div className="prod-stock-bar-wrap">
                      <div className="prod-stock-label">
                        <span>Estoque</span>
                        <span>{p.estoque_atual} {p.unidade} / mín {p.estoque_minimo}</span>
                      </div>
                      <div className="prod-stock-track">
                        <div className="prod-stock-fill" style={{ width: `${pct}%`, background: sColor }} />
                      </div>
                    </div>
                    <div className="prod-actions" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" onClick={e => openEdit(p, e)} title="Editar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="icon-btn danger" onClick={() => setConfirmDel(p)} title="Remover">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 140 }}
            onClick={() => setSelected(null)}
          />
          <div className="detail-panel">
            <div className="detail-header">
              <div>
                <div className="detail-name">{selected.nome}</div>
                {selected.sku && <div className="detail-sku">SKU: {selected.sku}</div>}
                <div style={{ marginTop: 10 }}>
                  <span className={`badge ${statusLabel(selected).cls}`}>{statusLabel(selected).text}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="detail-body">
              {/* Preços */}
              <div>
                <div className="detail-section-title">Precificação</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-item-lbl">Preço de Venda</div>
                    <div className="detail-item-val green">{fmtBRL(selected.preco_venda)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Custo</div>
                    <div className="detail-item-val">{fmtBRL(selected.preco_custo)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Margem de Lucro</div>
                    <div className="detail-item-val green">
                      {selected.preco_custo > 0
                        ? `${(((selected.preco_venda - selected.preco_custo) / selected.preco_custo) * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Lucro Unitário</div>
                    <div className="detail-item-val green">{fmtBRL(selected.preco_venda - selected.preco_custo)}</div>
                  </div>
                </div>
              </div>

              {/* Estoque */}
              <div>
                <div className="detail-section-title">Estoque</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-item-lbl">Quantidade Atual</div>
                    <div className={`detail-item-val ${selected.estoque_atual === 0 ? 'red' : selected.estoque_atual <= selected.estoque_minimo ? 'orange' : 'green'}`}>
                      {selected.estoque_atual} {selected.unidade}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Estoque Mínimo</div>
                    <div className="detail-item-val">{selected.estoque_minimo} {selected.unidade}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Valor em Estoque</div>
                    <div className="detail-item-val">{fmtBRL(selected.estoque_atual * selected.preco_custo)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Valor de Venda</div>
                    <div className="detail-item-val green">{fmtBRL(selected.estoque_atual * selected.preco_venda)}</div>
                  </div>
                </div>
              </div>

              {/* Categorização */}
              <div>
                <div className="detail-section-title">Categorização</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-item-lbl">Categoria</div>
                    <div className="detail-item-val" style={{ fontSize: 13 }}>{selected.categoria || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Fornecedor</div>
                    <div className="detail-item-val" style={{ fontSize: 13 }}>{selected.fornecedor || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item-lbl">Unidade</div>
                    <div className="detail-item-val" style={{ fontSize: 13 }}>{selected.unidade}</div>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {selected.descricao && (
                <div>
                  <div className="detail-section-title">Descrição</div>
                  <div className="detail-desc">{selected.descricao}</div>
                </div>
              )}
            </div>

            <div className="detail-footer">
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={e => openEdit(selected, e)}>
                Editar Produto
              </button>
              <button className="btn btn-danger" onClick={() => setConfirmDel(selected)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                </svg>
              </button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Fechar</button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL NOVO PRODUTO ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingId ? 'Editar Produto' : 'Novo Produto'}</div>
                <div className="modal-sub">{editingId ? 'Atualize as informações do produto' : 'Preencha as informações do produto cosmético'}</div>
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingId(null); }}>×</button>
            </div>

            <div className="modal-body">
              {formError && (
                <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ff4757', fontFamily: 'JetBrains Mono, monospace' }}>
                  ⚠ {formError}
                </div>
              )}

              <div className="form-row">
                <div className="form-field full">
                  <label className="form-label">Nome do Produto *</label>
                  <input className="form-input" placeholder="Ex: Creme Hidratante Facial 50ml"
                    value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">SKU / Código</label>
                  <input className="form-input" placeholder="Ex: CHF-001"
                    value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Unidade</label>
                  <select className="form-select" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                    <option value="un">un (unidade)</option>
                    <option value="ml">ml</option>
                    <option value="g">g (gramas)</option>
                    <option value="kg">kg</option>
                    <option value="cx">cx (caixa)</option>
                    <option value="kit">kit</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Preço de Venda (R$) *</label>
                  <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
                    value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Preço de Custo (R$)</label>
                  <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
                    value={form.preco_custo} onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Estoque Inicial</label>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={form.estoque_atual} onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Estoque Mínimo</label>
                  <input className="form-input" type="number" min="0" placeholder="5"
                    value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Fornecedor</label>
                  <select className="form-select" value={form.fornecedor_id} onChange={e => setForm(f => ({ ...f, fornecedor_id: e.target.value }))}>
                    <option value="">Sem fornecedor</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Descrição</label>
                <textarea className="form-textarea" placeholder="Descreva o produto, composição, modo de uso..."
                  value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>

              {/* Preview margem */}
              {form.preco_venda && form.preco_custo && parseFloat(form.preco_custo) > 0 && (
                <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(232,234,237,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>MARGEM</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#00d4aa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {(((parseFloat(form.preco_venda) - parseFloat(form.preco_custo)) / parseFloat(form.preco_custo)) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(232,234,237,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>LUCRO UNIT.</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#00d4aa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtBRL(parseFloat(form.preco_venda) - parseFloat(form.preco_custo))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDel && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="confirm-dialog">
            <div className="confirm-title">Remover produto?</div>
            <div className="confirm-text">
              Tem certeza que deseja remover <strong style={{ color: '#e8eaed' }}>{confirmDel.nome}</strong>?
              Esta ação não pode ser desfeita.
            </div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDel.id)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast">
          <span className="toast-icon">{toast.icon}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}