import { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:    url     => fetch(BASE+url,{headers:h()}).then(r=>r.json()),
  post:   (url,b) => fetch(BASE+url,{method:'POST',  headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  put:    (url,b) => fetch(BASE+url,{method:'PUT',   headers:h(),body:JSON.stringify(b)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
  del:    url     => fetch(BASE+url,{method:'DELETE', headers:h()}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||'Erro');return d;}),
};

const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const txt = (v) => v==null ? '' : (typeof v==='object' ? (v.nome||v.produto||v.label||'') : v);
const fmtTel = t => t ? t.replace(/\D/g,'').replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3') : '—';
const COLORS = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757'];
const avatarColor = n => COLORS[(n?.charCodeAt(0)||0) % COLORS.length];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
.pg{padding:24px;display:flex;flex-direction:column;gap:20px;font-family:'Plus Jakarta Sans',sans-serif;color:#e8eaed;animation:pgIn .3s ease both;}
@keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pg-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-title{font-size:22px;font-weight:800;}
.pg-sub{font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.stats{display:flex;gap:12px;flex-wrap:wrap;}
.stat{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px;}
.st-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.st-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;}
.st-lbl{font-size:11px;color:rgba(232,234,237,.35);margin-top:1px;}
.srch{display:flex;align-items:center;gap:8px;background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 14px;flex:1;min-width:200px;transition:border-color .2s;}
.srch:focus-within{border-color:rgba(0,212,170,.4);}
.srch input{background:none;border:none;outline:none;font-size:13px;color:#e8eaed;font-family:'Plus Jakarta Sans',sans-serif;width:100%;}
.srch input::placeholder{color:rgba(232,234,237,.25);}

/* GRID */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.card{background:#0e1013;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .2s;animation:pgIn .3s ease both;}
.card:hover{border-color:rgba(255,255,255,.12);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.3);}
.card.selected{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 1px rgba(0,212,170,.15);}
.card.alerta{border-color:rgba(255,211,42,.3);}
.card-strip{height:3px;}
.card-top{padding:16px;border-bottom:1px solid rgba(255,255,255,.05);}
.card-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#000;margin-bottom:10px;}
.card-name{font-size:15px;font-weight:700;color:#e8eaed;}
.card-tel{font-size:12px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.4);margin-top:3px;}
.card-mid{padding:12px 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;border-bottom:1px solid rgba(255,255,255,.05);}
.mini-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;}
.mini-val{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#e8eaed;}
.mini-val.yellow{color:#ffd32a;}
.mini-val.green{color:#00d4aa;}
.card-bot{padding:10px 16px;display:flex;align-items:center;justify-content:flex-end;gap:6px;}
.icon-btn{width:30px;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.04);color:rgba(232,234,237,.7);padding:0;}
.icon-btn svg{display:block;stroke:currentColor;}
.icon-btn:hover{background:rgba(0,153,255,.12);color:#0099ff;border-color:rgba(0,153,255,.25);}
.icon-btn.danger{color:#ff4757;border-color:rgba(255,71,87,.2);background:rgba(255,71,87,.08);}
.icon-btn.danger:hover{background:rgba(255,71,87,.18);color:#ff6b7a;border-color:rgba(255,71,87,.35);}

/* DETAIL PANEL */
.dp{position:fixed;right:0;top:0;bottom:0;width:440px;background:#0e1013;border-left:1px solid rgba(255,255,255,.08);z-index:150;overflow-y:auto;display:flex;flex-direction:column;animation:slideIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:none}}
.dp::-webkit-scrollbar{width:4px;}
.dp::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}
.dp-head{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;}
.dp-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#000;flex-shrink:0;}
.dp-name{font-size:17px;font-weight:800;color:#e8eaed;}
.dp-meta{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);margin-top:3px;}
.dp-body{padding:20px 24px;flex:1;display:flex;flex-direction:column;gap:18px;}
.dp-sec{display:flex;flex-direction:column;gap:10px;}
.dp-sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;}
.dp-sec-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;}
.dp-kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.dp-kpi{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;}
.dp-kpi-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.dp-kpi-val{font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed;}
.dp-kpi-val.yellow{color:#ffd32a;}
.dp-kpi-val.green{color:#00d4aa;}

/* Compras accordion */
.compra-block{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;margin-bottom:8px;}
.compra-hdr{padding:11px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s;}
.compra-hdr:hover{background:rgba(255,255,255,.03);}
.compra-data{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);}
.compra-total{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa;}
.compra-body{border-top:1px solid rgba(255,255,255,.06);padding:12px 14px;display:flex;flex-direction:column;gap:10px;}
.compra-item{display:flex;justify-content:space-between;font-size:12px;color:rgba(232,234,237,.5);}
.compra-item-nome{font-weight:600;color:#e8eaed;}
.repasse-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.03);}
.repasse-row:last-child{border-bottom:none;}
.repasse-data{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);flex:1;}
.repasse-val{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa;}
.add-repasse-row{display:flex;gap:8px;align-items:center;margin-top:6px;}

/* Clientes list */
.cli-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);}
.cli-item:last-child{border-bottom:none;}
.cli-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000;flex-shrink:0;}
.cli-nome{font-size:13px;font-weight:600;color:#e8eaed;flex:1;}
.cli-tel{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);}

.dp-foot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;flex-shrink:0;}

/* BADGE */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}

.empty{padding:60px 20px;text-align:center;color:rgba(232,234,237,.25);}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4;}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}

/* MODAL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:pgIn .2s ease both;}
.modal{background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:580px;max-height:92vh;overflow-y:auto;animation:mIn .3s cubic-bezier(.22,1,.36,1) both;}
@keyframes mIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}
.mhd{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#0e1013;z-index:2;}
.mtitle{font-size:16px;font-weight:800;color:#e8eaed;}
.msub{font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px;}
.mclose{width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;}
.mclose:hover{background:rgba(255,71,87,.15);color:#ff4757;}
.mbody{padding:20px 24px;display:flex;flex-direction:column;gap:14px;}
.mfoot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:#0e1013;z-index:2;}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.05);}
.fr2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ff{display:flex;flex-direction:column;gap:5px;}
.fl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.fi,.fsel2{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;font-size:13px;color:#e8eaed;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s;width:100%;}
.fi::placeholder{color:rgba(232,234,237,.2);}
.fi:focus,.fsel2:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);}
.fsel2 option{background:#0e1013;}
.ferr{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff4757;font-family:'JetBrains Mono',monospace;}
.total-box{background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;}
.total-label{font-size:13px;color:rgba(232,234,237,.5);}
.total-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#00d4aa;}

/* produto rows no modal compra */
.prod-search-wrap{position:relative;}
.prod-search-input{background:#13161a;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;font-size:13px;color:#e8eaed;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%;transition:border-color .2s;}
.prod-search-input:focus{border-color:rgba(0,212,170,.4);}
.prod-search-input::placeholder{color:rgba(232,234,237,.2);}
.prod-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#13161a;border:1px solid rgba(255,255,255,.1);border-radius:8px;z-index:50;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.4);}
.prod-opt{padding:10px 14px;cursor:pointer;transition:background .1s;border-bottom:1px solid rgba(255,255,255,.04);}
.prod-opt:last-child{border-bottom:none;}
.prod-opt:hover{background:rgba(0,212,170,.08);}
.prod-opt-nome{font-size:13px;font-weight:600;color:#e8eaed;}
.prod-opt-sub{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);margin-top:2px;}
.prod-opt-empty{padding:14px;text-align:center;font-size:12px;color:rgba(232,234,237,.25);font-family:'JetBrains Mono',monospace;}
.item-row{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;display:grid;grid-template-columns:1fr 80px 80px auto;gap:8px;align-items:center;}
.item-nome{font-size:13px;font-weight:600;color:#e8eaed;}
.item-sub{font-size:10px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;}
.item-input{background:#0e1013;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:6px 8px;font-size:12px;color:#e8eaed;font-family:'JetBrains Mono',monospace;outline:none;width:100%;text-align:right;}
.item-input:focus{border-color:rgba(0,212,170,.4);}
.item-del{background:none;border:none;color:rgba(255,71,87,.5);cursor:pointer;font-size:16px;padding:2px 4px;}
.item-del:hover{color:#ff4757;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.08);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.18);}
.btn-sm{padding:6px 12px;font-size:12px;}
.toast{position:fixed;bottom:24px;right:24px;background:#0e1013;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;color:#e8eaed;z-index:300;animation:pgIn .3s ease both;box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;}
@media(max-width:768px){.pg{padding:14px;gap:14px;}.grid{grid-template-columns:1fr;}.dp{width:100%;}.fr2{grid-template-columns:1fr;}.item-row{grid-template-columns:1fr auto auto auto;}}
`;

const FORM_PAR_EMPTY = { nome:'', telefone:'', email:'', observacao:'' };
const FORM_CLI_EMPTY = { nome:'', telefone:'', observacao:'' };

export default function Parceiras() {
  const [parceiras,  setParceiras]  = useState([]);
  const [produtos,   setProdutos]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [detalhe,    setDetalhe]    = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const [compraOpen, setCompraOpen] = useState({});
  const [toast,      setToast]      = useState(null);

  // Modais
  const [modal, setModal] = useState(null); // 'parceira'|'compra'|'cliente'|'repasse'
  const [formPar,  setFormPar]  = useState(FORM_PAR_EMPTY);
  const [formCli,  setFormCli]  = useState(FORM_CLI_EMPTY);
  const [editando, setEditando] = useState(null);

  // Compra
  const [itens,      setItens]      = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showDrop,   setShowDrop]   = useState(false);
  const [prodAdd,    setProdAdd]    = useState('');

  // venda para cliente da parceira
  const [modalVendaCli, setModalVendaCli] = useState(null); // { cliente }
  const [vendaModo,     setVendaModo]     = useState('produto'); // 'produto' | 'livre'
  const [vendaItens,    setVendaItens]    = useState([]);
  const [vendaBusca,    setVendaBusca]    = useState('');
  const [vendaSugest,   setVendaSugest]   = useState([]);
  const [vendaForm,     setVendaForm]     = useState({ modo_pagamento:'PIX', parcelado:false, num_parcelas:2, data_vencimento:'', desconto:'', valor_livre:'', descricao_livre:'', observacao:'', valor_entrada:'' });
  const [vendaSaving,   setVendaSaving]   = useState(false);
  const [vendaErr,      setVendaErr]      = useState('');
  const VF = (k,v) => setVendaForm(f=>({...f,[k]:v}));
  const [statusPag,  setStatusPag]  = useState('em_aberto');
  const [obsCompra,  setObsCompra]  = useState('');
  const [formErr,    setFormErr]    = useState('');
  const [saving,     setSaving]     = useState(false);

  // Repasse
  const [repasseCompra, setRepasseCompra] = useState(null);
  const [repasseVal,    setRepasseVal]    = useState('');
  const [repasseObs,    setRepasseObs]    = useState('');

  const showToast = (msg, icon='✓') => { setToast({msg,icon}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [par, prod] = await Promise.allSettled([
        api.get('/parceiras'),
        api.get('/produtos'),
      ]);
      if (par.status  === 'fulfilled') setParceiras(par.value);
      if (prod.status === 'fulfilled') setProdutos(prod.value);
    } finally { setLoading(false); }
  }, []);

  const loadDetalhe = useCallback(async (id) => {
    setLoadingDet(true);
    try {
      const d = await api.get(`/parceiras/${id}`);
      setDetalhe(d);
    } finally { setLoadingDet(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) loadDetalhe(selected.id); }, [selected, loadDetalhe]);

  const filtered = parceiras.filter(p =>
    !search || p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.telefone||'').includes(search)
  );

  // ── Itens da compra ────────────────────────────────────────────
  const addItem = () => {
    const prod = produtos.find(p => p.id === parseInt(prodAdd));
    if (!prod) return;
    if (itens.find(i => i.produto_id === prod.id)) {
      setItens(prev => prev.map(i => i.produto_id===prod.id ? {...i,quantidade:i.quantidade+1} : i));
    } else {
      setItens(prev => [...prev, { produto_id:prod.id, nome:prod.nome, sku:prod.sku,
        estoque:prod.estoque_atual, unidade:prod.unidade,
        preco_unitario:prod.preco_custo, quantidade:1 }]);
    }
    setProdAdd(''); setProdSearch('');
  };
  const updItem = (id, field, val) => setItens(prev => prev.map(i => i.produto_id===id ? {...i,[field]:val} : i));
  const delItem = id => setItens(prev => prev.filter(i => i.produto_id!==id));
  const totalCompra = itens.reduce((a,i) => a + i.quantidade * parseFloat(i.preco_unitario||0), 0);

  // ── Salvar parceira ────────────────────────────────────────────
  const salvarParceira = async () => {
    if (!formPar.nome.trim()) { setFormErr('Nome é obrigatório'); return; }
    setSaving(true); setFormErr('');
    try {
      if (editando) {
        await api.put(`/parceiras/${editando}`, formPar);
        showToast('Parceira atualizada!', '✎');
      } else {
        await api.post('/parceiras', formPar);
        showToast('Parceira cadastrada!');
      }
      setModal(null); setFormPar(FORM_PAR_EMPTY); setEditando(null);
      load();
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  // ── Salvar compra ──────────────────────────────────────────────
  const salvarCompra = async () => {
    if (!selected) return;
    if (itens.length===0) { setFormErr('Adicione ao menos 1 produto'); return; }
    for (const it of itens) {
      if (it.quantidade < 1) { setFormErr(`Quantidade inválida: ${it.nome}`); return; }
      if (it.quantidade > it.estoque) { setFormErr(`Estoque insuficiente: ${it.nome}`); return; }
    }
    setSaving(true); setFormErr('');
    try {
      const res = await api.post(`/parceiras/${selected.id}/compras`, {
        itens: itens.map(i=>({ produto_id:i.produto_id, quantidade:i.quantidade, preco_unitario:parseFloat(i.preco_unitario) })),
        status_pag: statusPag, observacao: obsCompra||null,
      });
      showToast(`Compra registrada! Total: ${fmtBRL(res.total)}`);
      setModal(null); setItens([]); setObsCompra(''); setStatusPag('em_aberto');
      load(); loadDetalhe(selected.id);
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  // ── Salvar cliente parceira ────────────────────────────────────
  const salvarCliente = async () => {
    if (!formCli.nome.trim()) { setFormErr('Nome é obrigatório'); return; }
    setSaving(true); setFormErr('');
    try {
      await api.post(`/parceiras/${selected.id}/clientes`, formCli);
      showToast('Cliente adicionado!');
      setModal(null); setFormCli(FORM_CLI_EMPTY);
      loadDetalhe(selected.id);
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  // ── Salvar repasse ─────────────────────────────────────────────
  const salvarRepasse = async () => {
    if (!repasseCompra || !repasseVal) { setFormErr('Informe o valor'); return; }
    setSaving(true); setFormErr('');
    try {
      const res = await api.post(`/parceiras/${selected.id}/compras/${repasseCompra}/repasses`, {
        valor: parseFloat(repasseVal), observacao: repasseObs||null,
      });
      showToast(`Repasse registrado! Saldo: ${fmtBRL(res.saldo_restante)}`);
      setModal(null); setRepasseVal(''); setRepasseObs(''); setRepasseCompra(null);
      load(); loadDetalhe(selected.id);
    } catch(e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const deletarParceira = async (id) => {
    try {
      await api.del(`/parceiras/${id}`);
      showToast('Parceira removida.', '🗑');
      setSelected(null); setDetalhe(null); load();
    } catch(e) { showToast(e.message, '✕'); }
  };

  const deletarCliente = async (pid, cid) => {
    try {
      await api.del(`/parceiras/${pid}/clientes/${cid}`);
      showToast('Cliente removido.', '🗑');
      loadDetalhe(pid);
    } catch(e) { showToast(e.message, '✕'); }
  };

  const totalSaldo = parceiras.reduce((a,p) => a + p.saldo_em_aberto, 0);

  const statusBadge = s => {
    if (s==='pago')      return <span className="badge b-green">PAGO</span>;
    if (s==='parcelado') return <span className="badge b-yellow">PARCELADO</span>;
    return <span className="badge b-yellow">EM ABERTO</span>;
  };

  const salvarVendaCli = async () => {
    if (!modalVendaCli) return;
    if (vendaModo==='produto' && vendaItens.length===0) { setVendaErr('Adicione pelo menos um produto.'); return; }
    if (vendaModo==='livre' && (!vendaForm.valor_livre || parseFloat(vendaForm.valor_livre)<=0)) { setVendaErr('Informe o valor.'); return; }
    if (!vendaForm.data_vencimento) { setVendaErr('Data de vencimento obrigatória.'); return; }
    setVendaSaving(true); setVendaErr('');
    try {
      const desc = parseFloat(vendaForm.desconto)||0;
      const subtotal = vendaModo==='livre' ? parseFloat(vendaForm.valor_livre)||0 : vendaItens.reduce((a,i)=>a+i.preco*i.quantidade,0);
      const total = Math.max(subtotal-(vendaModo==='livre'?0:desc),0);
      const entrada = Math.min(parseFloat(vendaForm.valor_entrada)||0, total);
      await api.post('/vendas/unificada', {
        cliente_id: modalVendaCli.cliente_id,
        itens: vendaModo==='produto' ? vendaItens.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,preco_unitario:i.preco,desconto_item:0})) : [],
        modo_pagamento: vendaForm.modo_pagamento,
        parcelado: vendaForm.parcelado,
        num_parcelas: vendaForm.parcelado ? parseInt(vendaForm.num_parcelas) : 1,
        data_vencimento: vendaForm.data_vencimento,
        desconto_geral: vendaModo==='produto' ? desc : 0,
        observacao: vendaForm.observacao||null,
        valor_entrada: entrada,
        ...(vendaModo==='livre' && { valor_livre: parseFloat(vendaForm.valor_livre), descricao_livre: vendaForm.descricao_livre||'Venda avulsa' }),
      });
      setModalVendaCli(null);
      setVendaItens([]);
      setVendaForm({modo_pagamento:'PIX',parcelado:false,num_parcelas:2,data_vencimento:'',desconto:'',valor_livre:'',descricao_livre:'',observacao:'',valor_entrada:''});
      showToast('Venda registrada com sucesso!', '✓');
      if (selected) loadDetalhe(selected.id);
      load();
    } catch(e) {
      setVendaErr(e.message||'Erro ao registrar venda.');
    } finally { setVendaSaving(false); }
  };


  return (
    <>
      <style>{S}</style>
      <div className="pg">
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Parceiras</div>
            <div className="pg-sub">{parceiras.length} vendedora(s) ativa(s)</div>
          </div>
          <button className="btn btn-primary" onClick={()=>{ setFormPar(FORM_PAR_EMPTY); setEditando(null); setFormErr(''); setModal('parceira'); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Parceira
          </button>
        </div>

        <div className="stats">
          {[
            { label:'Parceiras',    val: parceiras.length,       color:'#00d4aa' },
            { label:'Saldo aberto', val: fmtBRL(totalSaldo),     color:'#ffd32a', small:true },
            { label:'Com débito',   val: parceiras.filter(p=>p.saldo_em_aberto>0).length, color:'#ff6b35' },
          ].map(s=>(
            <div key={s.label} className="stat">
              <div className="st-dot" style={{background:s.color}}/>
              <div>
                <div className="st-val" style={{fontSize:s.small?13:18}}>{s.val}</div>
                <div className="st-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="srch">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'rgba(232,234,237,.28)',flexShrink:0}}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Buscar parceira..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16}}>×</button>}
        </div>

        <div className="grid">
          {loading ? Array.from({length:4}).map((_,i)=>(
            <div key={i} className="card" style={{cursor:'default'}}>
              <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
                <div className="skel" style={{height:38,width:38,borderRadius:'50%'}}/>
                <div className="skel" style={{height:16,width:'70%'}}/>
                <div className="skel" style={{height:12,width:'45%'}}/>
              </div>
            </div>
          )) : filtered.length===0 ? (
            <div className="empty" style={{gridColumn:'1/-1'}}>
              <div className="empty-icon">◎</div>
              <div>Nenhuma parceira cadastrada</div>
            </div>
          ) : filtered.map((p,i) => {
            const color = avatarColor(p.nome);
            return (
              <div key={p.id} className={`card${selected?.id===p.id?' selected':''}${p.alerta?' alerta':''}`}
                style={{animationDelay:`${i*.04}s`}}
                onClick={()=>setSelected(selected?.id===p.id?null:p)}>
                <div className="card-strip" style={{background:p.alerta?'rgba(255,211,42,.5)':'rgba(0,212,170,.2)'}}/>
                <div className="card-top">
                  <div className="card-avatar" style={{background:color}}>{p.nome[0]?.toUpperCase()}</div>
                  <div className="card-name">{p.nome}</div>
                  <div className="card-tel">{fmtTel(p.telefone)}</div>
                </div>
                <div className="card-mid">
                  <div><div className="mini-lbl">Compras</div><div className="mini-val">{p.num_compras}</div></div>
                  <div><div className="mini-lbl">Em aberto</div><div className={`mini-val ${p.saldo_em_aberto>0?'yellow':'green'}`}>{p.saldo_em_aberto>0?fmtBRL(p.saldo_em_aberto):'—'}</div></div>
                  <div><div className="mini-lbl">Clientes</div><div className="mini-val">{p.num_clientes}</div></div>
                </div>
                <div className="card-bot" onClick={e=>e.stopPropagation()}>
                  <button className="icon-btn" title="Editar" onClick={()=>{ setFormPar({nome:p.nome,telefone:p.telefone||'',email:p.email||'',observacao:p.observacao||''}); setEditando(p.id); setFormErr(''); setModal('parceira'); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button className="icon-btn danger" title="Remover" onClick={()=>deletarParceira(p.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:140}} onClick={()=>{ setSelected(null); setDetalhe(null); }}/>
          <div className="dp">
            <div className="dp-head">
              <div style={{display:'flex',gap:12,alignItems:'flex-start',flex:1,minWidth:0}}>
                <div className="dp-avatar" style={{background:avatarColor(selected.nome)}}>{selected.nome[0]?.toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="dp-name">{selected.nome}</div>
                  <div className="dp-meta">{fmtTel(selected.telefone)}</div>
                </div>
              </div>
              <button className="mclose" onClick={()=>{ setSelected(null); setDetalhe(null); }}>×</button>
            </div>

            <div className="dp-body">
              {loadingDet ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[1,2,3].map(i=><div key={i} className="skel" style={{height:60}}/>)}
                </div>
              ) : detalhe && (
                <>
                  {/* KPIs */}
                  <div className="dp-kpis">
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Total compras</div><div className="dp-kpi-val" style={{fontSize:12}}>{fmtBRL(detalhe.total_compras)}</div></div>
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Repasses</div><div className="dp-kpi-val green" style={{fontSize:12}}>{fmtBRL(detalhe.total_repasses)}</div></div>
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Em aberto</div><div className={`dp-kpi-val ${detalhe.saldo_em_aberto>0?'yellow':'green'}`} style={{fontSize:12}}>{fmtBRL(detalhe.saldo_em_aberto)}</div></div>
                  </div>

                  {/* Mini-dashboard de VENDAS aos clientes da parceira */}
                  {detalhe.vendas_resumo && detalhe.vendas_resumo.num_vendas > 0 && (
                    <div style={{background:'linear-gradient(135deg,rgba(0,212,170,.06),rgba(145,102,216,.04))',border:'1px solid rgba(0,212,170,.15)',borderRadius:14,padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#00d4aa',fontFamily:'JetBrains Mono,monospace'}}>
                          💰 Vendas da carteira
                        </div>
                        <span style={{fontSize:10,color:'rgba(232,234,237,.4)',fontFamily:'JetBrains Mono,monospace'}}>{detalhe.vendas_resumo.num_vendas} venda(s)</span>
                      </div>
                      {/* 3 KPIs de venda */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                        <div>
                          <div style={{fontSize:9,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>VENDIDO</div>
                          <div style={{fontSize:16,fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:'#e8eaed'}}>{fmtBRL(detalhe.vendas_resumo.total_vendido)}</div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>RECEBIDO</div>
                          <div style={{fontSize:16,fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:'#00d4aa'}}>{fmtBRL(detalhe.vendas_resumo.total_recebido)}</div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>A RECEBER</div>
                          <div style={{fontSize:16,fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:detalhe.vendas_resumo.saldo_receber>0?'#ffd32a':'#00d4aa'}}>{fmtBRL(detalhe.vendas_resumo.saldo_receber)}</div>
                        </div>
                      </div>
                      {/* barra de progresso recebido/vendido */}
                      {detalhe.vendas_resumo.total_vendido > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <div style={{height:5,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${Math.min((detalhe.vendas_resumo.total_recebido/detalhe.vendas_resumo.total_vendido)*100,100)}%`,background:'linear-gradient(90deg,#00d4aa,#9166d8)',borderRadius:3,transition:'width .6s'}}/>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.35)'}}>
                            <span>{((detalhe.vendas_resumo.total_recebido/detalhe.vendas_resumo.total_vendido)*100).toFixed(0)}% recebido</span>
                            {detalhe.vendas_resumo.num_vencidas>0 && <span style={{color:'#ff4757'}}>{detalhe.vendas_resumo.num_vencidas} vencida(s)</span>}
                          </div>
                        </div>
                      )}
                      {/* lista compacta das últimas vendas */}
                      {detalhe.vendas?.length > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:2}}>
                          {detalhe.vendas.slice(0,4).map(v=>{
                            const cls = v.status_pagamento==='pago'?'#00d4aa':v.status_pagamento==='vencido'?'#ff4757':'#ffd32a';
                            const lbl = v.status_pagamento==='pago'?'PAGO':v.status_pagamento==='vencido'?'VENCIDO':'ABERTO';
                            return (
                              <div key={v.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,fontSize:12}}>
                                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#e8eaed'}}>{v.cliente}</span>
                                <span style={{fontSize:9,fontWeight:700,color:cls,fontFamily:'JetBrains Mono,monospace'}}>{lbl}</span>
                                <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#e8eaed',minWidth:72,textAlign:'right'}}>{fmtBRL(v.valor_total)}</span>
                              </div>
                            );
                          })}
                          {detalhe.vendas.length > 4 && (
                            <div style={{textAlign:'center',fontSize:10,color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',paddingTop:2}}>
                              + {detalhe.vendas.length - 4} venda(s) — ver em Vendas/Relatórios
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compras */}
                  <div className="dp-sec">
                    <div className="dp-sec-hdr">
                      <div className="dp-sec-title">Compras ({detalhe.compras.length})</div>
                      <button className="btn btn-primary btn-sm" onClick={()=>{ setItens([]); setFormErr(''); setStatusPag('em_aberto'); setObsCompra(''); setModal('compra'); }}>+ Nova Compra</button>
                    </div>
                    {detalhe.compras.length===0 ? (
                      <div style={{textAlign:'center',padding:'16px',color:'rgba(232,234,237,.25)',fontSize:12,fontFamily:'JetBrains Mono,monospace'}}>Nenhuma compra registrada</div>
                    ) : detalhe.compras.map(c=>(
                      <div key={c.id} className="compra-block">
                        <div className="compra-hdr" onClick={()=>setCompraOpen(o=>({...o,[c.id]:!o[c.id]}))}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              {statusBadge(c.status_pag)}
                              {c.saldo>0 && <span style={{fontSize:11,color:'#ffd32a',fontFamily:'JetBrains Mono,monospace'}}>Falta {fmtBRL(c.saldo)}</span>}
                            </div>
                            <div className="compra-data" style={{marginTop:4}}>{c.criado_em}</div>
                          </div>
                          <div className="compra-total">{fmtBRL(c.valor_total)}</div>
                          <span style={{fontSize:11,color:'rgba(232,234,237,.3)',marginLeft:8}}>{compraOpen[c.id]?'▲':'▼'}</span>
                        </div>
                        {compraOpen[c.id] && (
                          <div className="compra-body">
                            {/* Itens */}
                            <div>
                              <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.28)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Produtos</div>
                              {c.itens.map((it,i)=>(
                                <div key={i} className="compra-item">
                                  <span className="compra-item-nome">{txt(it.produto)}</span>
                                  <span style={{color:'rgba(232,234,237,.35)',fontSize:11}}>{it.quantidade}x {fmtBRL(it.preco_unitario)}</span>
                                  <span style={{color:'#00d4aa',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{fmtBRL(it.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            {/* Repasses */}
                            <div>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                                <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.28)',textTransform:'uppercase',letterSpacing:'.1em'}}>Repasses</div>
                                {c.saldo>0 && <button className="btn btn-ghost btn-sm" onClick={()=>{ setRepasseCompra(c.id); setRepasseVal(''); setRepasseObs(''); setFormErr(''); setModal('repasse'); }}>+ Repasse</button>}
                              </div>
                              {c.repasses.length===0 ? (
                                <div style={{fontSize:11,color:'rgba(232,234,237,.25)',fontFamily:'JetBrains Mono,monospace'}}>Nenhum repasse</div>
                              ) : c.repasses.map(r=>(
                                <div key={r.id} className="repasse-row">
                                  <span className="repasse-data">{r.data}{r.observacao?` · ${r.observacao}`:''}</span>
                                  <span className="repasse-val">{fmtBRL(r.valor)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Clientes */}
                  <div className="dp-sec">
                    <div className="dp-sec-hdr">
                      <div className="dp-sec-title">Clientes ({detalhe.clientes.length})</div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>{ setFormCli(FORM_CLI_EMPTY); setFormErr(''); setModal('cliente'); }}>+ Cliente</button>
                    </div>
                    {detalhe.clientes.length===0 ? (
                      <div style={{textAlign:'center',padding:'12px',color:'rgba(232,234,237,.25)',fontSize:12,fontFamily:'JetBrains Mono,monospace'}}>Nenhum cliente vinculado</div>
                    ) : detalhe.clientes.map(cl=>(
                      <div key={cl.id} className="cli-item" style={{alignItems:'center',gap:10}}>
                        <div className="cli-dot" style={{background:avatarColor(cl.nome),flexShrink:0}}>{cl.nome[0]?.toUpperCase()}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="cli-nome">{cl.nome}</div>
                          <div className="cli-tel">{fmtTel(cl.telefone)}</div>
                        </div>
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          {/* Nova venda — ícone cifrão */}
                          <button
                            onClick={()=>{ setModalVendaCli({cliente_id:cl.cliente_id||cl.id, nome:cl.nome}); setVendaModo('produto'); setVendaItens([]); setVendaErr(''); setVendaForm({modo_pagamento:'PIX',parcelado:false,num_parcelas:2,data_vencimento:'',desconto:'',valor_livre:'',descricao_livre:'',observacao:'',valor_entrada:''}); }}
                            title="Nova venda para este cliente"
                            style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(0,212,170,.25)',background:'rgba(0,212,170,.12)',color:'#00d4aa',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'all .15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,212,170,.22)';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,212,170,.12)';}}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}>
                              <line x1="12" y1="1" x2="12" y2="23"/>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                          </button>
                          {/* Remover cliente — ícone lixeira */}
                          <button
                            onClick={()=>deletarCliente(selected.id,cl.id)}
                            title="Remover cliente"
                            style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,71,87,.25)',background:'rgba(255,71,87,.1)',color:'#ff4757',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'all .15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,71,87,.2)';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,71,87,.1)';}}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}>
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── MODAL VENDA CLIENTE PARCEIRA ── */}
      {modalVendaCli && (() => {
        const MODOS_PAG = ['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Fiado','Transferência','Boleto'];
        const desc    = parseFloat(vendaForm.desconto)||0;
        const subtotalP = vendaItens.reduce((a,i)=>a+i.preco*i.quantidade,0);
        const subtotal  = vendaModo==='livre' ? parseFloat(vendaForm.valor_livre)||0 : subtotalP;
        const total     = Math.max(subtotal - (vendaModo==='livre'?0:desc), 0);
        const entrada   = Math.min(parseFloat(vendaForm.valor_entrada)||0, total);
        const restante  = Math.max(total - entrada, 0);
        const valParc   = vendaForm.parcelado && vendaForm.num_parcelas>1 && restante>0 ? restante/parseInt(vendaForm.num_parcelas) : null;
        return (
          <div onClick={e=>{if(e.target===e.currentTarget)setModalVendaCli(null);}}
            style={{position:'fixed',inset:0,zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.75)',backdropFilter:'blur(5px)'}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:'#13161a',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>

              {/* Header */}
              <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:'#e8eaed'}}>Nova Venda</div>
                  <div style={{fontSize:11,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>{modalVendaCli.nome}</div>
                </div>
                <button onClick={()=>setModalVendaCli(null)} style={{background:'none',border:'none',color:'rgba(232,234,237,.35)',cursor:'pointer',fontSize:22,lineHeight:1}}>×</button>
              </div>

              {/* Body */}
              <div style={{overflowY:'auto',flex:1,padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
                {vendaErr && <div style={{fontSize:12,color:'#ff4757',background:'rgba(255,71,87,.08)',border:'1px solid rgba(255,71,87,.2)',borderRadius:8,padding:'8px 12px'}}>⚠ {vendaErr}</div>}

                {/* Toggle modo */}
                <div style={{display:'flex',gap:6,background:'rgba(255,255,255,.03)',borderRadius:9,padding:4}}>
                  {[['produto','📦 Produto do catálogo'],['livre','✏ Valor livre']].map(([m,l])=>(
                    <button key={m} onClick={()=>setVendaModo(m)}
                      style={{flex:1,padding:'7px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .2s',background:vendaModo===m?(m==='produto'?'rgba(0,212,170,.15)':'rgba(255,211,42,.15)'):'transparent',color:vendaModo===m?(m==='produto'?'#00d4aa':'#ffd32a'):'rgba(232,234,237,.4)'}}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* Produtos ou valor livre */}
                {vendaModo==='livre' ? (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div>
                      <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Descrição</div>
                      <input style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none'}} placeholder="Ex: Produto avulso, serviço..."
                        value={vendaForm.descricao_livre} onChange={e=>VF('descricao_livre',e.target.value)}/>
                    </div>
                    <div>
                      <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Valor (R$) *</div>
                      <input type="number" min="0.01" step="0.01" autoFocus
                        style={{width:'100%',background:'#0a0c0f',border:'1px solid rgba(255,211,42,.3)',borderRadius:10,padding:'12px 16px',fontSize:22,fontWeight:700,color:'#e8eaed',fontFamily:'JetBrains Mono,monospace',outline:'none'}}
                        placeholder="0,00" value={vendaForm.valor_livre} onChange={e=>VF('valor_livre',e.target.value)}/>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{position:'relative'}}>
                      <input style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none'}}
                        placeholder="Buscar produto por nome ou SKU..."
                        value={vendaBusca} onChange={e=>setVendaBusca(e.target.value)}/>
                      {vendaSugest.length > 0 && (
                        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1a1d22',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,zIndex:10,maxHeight:180,overflowY:'auto'}}>
                          {vendaSugest.map(p=>(
                            <div key={p.id} onClick={()=>vendaAddItem(p)}
                              style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,borderBottom:'1px solid rgba(255,255,255,.04)'}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <span style={{fontWeight:600,color:'#e8eaed'}}>{p.nome}</span>
                              <span style={{fontWeight:700,color:'#00d4aa',fontFamily:'JetBrains Mono,monospace'}}>{fmtBRL(p.preco_venda)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {vendaItens.length===0 ? (
                      <div style={{textAlign:'center',padding:'12px',color:'rgba(232,234,237,.25)',fontSize:11,fontFamily:'JetBrains Mono,monospace',background:'rgba(255,255,255,.02)',borderRadius:8}}>Nenhum produto adicionado</div>
                    ) : vendaItens.map(i=>(
                      <div key={i.produto_id} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:8,padding:'8px 12px'}}>
                        <div style={{flex:1,fontSize:13,fontWeight:600,color:'#e8eaed'}}>{i.nome}</div>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <button onClick={()=>setVendaItens(its=>its.map(x=>x.produto_id===i.produto_id?{...x,quantidade:Math.max(1,x.quantidade-1)}:x))} style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'#e8eaed',cursor:'pointer'}}>−</button>
                          <span style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',minWidth:22,textAlign:'center'}}>{i.quantidade}</span>
                          <button onClick={()=>setVendaItens(its=>its.map(x=>x.produto_id===i.produto_id?{...x,quantidade:x.quantidade+1}:x))} style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'#e8eaed',cursor:'pointer'}}>+</button>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:'#00d4aa',fontFamily:'JetBrains Mono,monospace',minWidth:72,textAlign:'right'}}>{fmtBRL(i.preco*i.quantidade)}</span>
                        <button onClick={()=>setVendaItens(its=>its.filter(x=>x.produto_id!==i.produto_id))} style={{background:'none',border:'none',color:'rgba(255,71,87,.5)',cursor:'pointer',fontSize:15}}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagamento */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Forma de pagamento</div>
                    <select style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none',cursor:'pointer'}}
                      value={vendaForm.modo_pagamento} onChange={e=>VF('modo_pagamento',e.target.value)}>
                      {MODOS_PAG.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Data de vencimento *</div>
                    <input type="date" style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none'}}
                      value={vendaForm.data_vencimento} onChange={e=>VF('data_vencimento',e.target.value)}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Valor de entrada (R$)</div>
                    <input type="number" min="0" step="0.01" style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none'}}
                      placeholder="0,00 — opcional" value={vendaForm.valor_entrada} onChange={e=>VF('valor_entrada',e.target.value)}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Parcelado?</div>
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'rgba(232,234,237,.7)',marginTop:8}}>
                      <input type="checkbox" checked={vendaForm.parcelado} onChange={e=>VF('parcelado',e.target.checked)} style={{accentColor:'#00d4aa',width:15,height:15}}/>
                      Sim, parcelar
                    </label>
                  </div>
                  {vendaForm.parcelado && (
                    <div>
                      <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:'JetBrains Mono,monospace',marginBottom:5}}>Nº de parcelas</div>
                      <select style={{width:'100%',background:'#0e1013',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#e8eaed',outline:'none',cursor:'pointer'}}
                        value={vendaForm.num_parcelas} onChange={e=>VF('num_parcelas',e.target.value)}>
                        {[2,3,4,5,6,7,8,9,10,12].map(n=><option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Totais */}
                {total > 0 && (
                  <div style={{background:'rgba(0,212,170,.04)',border:'1px solid rgba(0,212,170,.12)',borderRadius:10,padding:'12px 16px',display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:800}}>
                      <span style={{color:'#e8eaed'}}>Total</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',color:'#00d4aa'}}>{fmtBRL(total)}</span>
                    </div>
                    {entrada>0 && <>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:6}}>
                        <span style={{color:'#00d4aa'}}>✓ Entrada</span>
                        <span style={{fontFamily:'JetBrains Mono,monospace',color:'#00d4aa'}}>- {fmtBRL(entrada)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700}}>
                        <span style={{color:'#e8eaed'}}>Restante</span>
                        <span style={{fontFamily:'JetBrains Mono,monospace',color:'#ffd32a'}}>{fmtBRL(restante)}</span>
                      </div>
                    </>}
                    {valParc && <div style={{fontSize:11,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>{vendaForm.num_parcelas}x de {fmtBRL(valParc)}</div>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',gap:10}}>
                <button onClick={()=>setModalVendaCli(null)}
                  style={{flex:1,padding:'10px',borderRadius:9,border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'rgba(232,234,237,.5)',cursor:'pointer',fontSize:13,fontWeight:600}}>
                  Cancelar
                </button>
                <button onClick={salvarVendaCli} disabled={vendaSaving}
                  style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:9,border:'none',cursor:vendaSaving?'not-allowed':'pointer',fontSize:13,fontWeight:700,background:vendaSaving?'rgba(255,255,255,.06)':'linear-gradient(135deg,#00d4aa,#0099ff)',color:vendaSaving?'rgba(232,234,237,.3)':'#0d1117',transition:'all .2s'}}>
                  {vendaSaving ? 'Salvando...' : '✓ Confirmar Venda'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL PARCEIRA ── */}
      {modal==='parceira' && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="mhd">
              <div><div className="mtitle">{editando?'Editar':'Nova'} Parceira</div></div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="ff"><label className="fl">Nome *</label><input className="fi" value={formPar.nome} onChange={e=>setFormPar(f=>({...f,nome:e.target.value}))} placeholder="Nome da parceira"/></div>
              <div className="fr2">
                <div className="ff"><label className="fl">Telefone</label><input className="fi" value={formPar.telefone} onChange={e=>setFormPar(f=>({...f,telefone:e.target.value}))} placeholder="(11) 99999-9999"/></div>
                <div className="ff"><label className="fl">Email</label><input className="fi" type="email" value={formPar.email} onChange={e=>setFormPar(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></div>
              </div>
              <div className="ff"><label className="fl">Observação</label><input className="fi" value={formPar.observacao} onChange={e=>setFormPar(f=>({...f,observacao:e.target.value}))} placeholder="Opcional..."/></div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarParceira} disabled={saving}>{saving?'Salvando...':editando?'Salvar':'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMPRA ── */}
      {modal==='compra' && selected && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="mhd">
              <div><div className="mtitle">Nova Compra</div><div className="msub">{selected.nome}</div></div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="sec-title">Produtos</div>
              <div className="prod-search-wrap">
                <input className="prod-search-input" placeholder="Buscar produto por nome ou SKU..."
                  value={prodSearch}
                  onChange={e=>{ setProdSearch(e.target.value); setShowDrop(true); setProdAdd(''); }}
                  onFocus={()=>setShowDrop(true)}
                  onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
                />
                {showDrop && (
                  <div className="prod-dropdown">
                    {produtos.filter(p=>!itens.find(i=>i.produto_id===p.id)&&(!prodSearch||p.nome.toLowerCase().includes(prodSearch.toLowerCase())||(p.sku||'').toLowerCase().includes(prodSearch.toLowerCase()))).slice(0,20).map(p=>(
                      <div key={p.id} className="prod-opt" onMouseDown={()=>{ setProdAdd(String(p.id)); setProdSearch(p.nome); setShowDrop(false); }}>
                        <div className="prod-opt-nome">{p.nome}</div>
                        <div className="prod-opt-sub">{p.sku?`SKU: ${p.sku} · `:''}estoque: {p.estoque_atual} {p.unidade} · custo: {fmtBRL(p.preco_custo)}</div>
                      </div>
                    ))}
                    {produtos.filter(p=>!itens.find(i=>i.produto_id===p.id)&&(!prodSearch||p.nome.toLowerCase().includes(prodSearch.toLowerCase())||(p.sku||'').toLowerCase().includes(prodSearch.toLowerCase()))).length===0 && <div className="prod-opt-empty">Nenhum produto encontrado</div>}
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-start'}} onClick={addItem} disabled={!prodAdd}>+ Adicionar</button>

              {itens.length>0 && (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {itens.map(it=>(
                    <div key={it.produto_id} className="item-row">
                      <div><div style={{fontSize:13,fontWeight:600,color:'#e8eaed'}}>{it.nome}</div><div style={{fontSize:10,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace'}}>estoque: {it.estoque} {it.unidade}</div></div>
                      <input className="item-input" type="number" min="1" max={it.estoque} value={it.quantidade} onChange={e=>updItem(it.produto_id,'quantidade',parseInt(e.target.value)||1)} placeholder="Qtd"/>
                      <input className="item-input" type="number" min="0" step="0.01" value={it.preco_unitario} onChange={e=>updItem(it.produto_id,'preco_unitario',e.target.value)} placeholder="Preço"/>
                      <button className="item-del" onClick={()=>delItem(it.produto_id)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="sec-title">Pagamento</div>
              <div className="fr2">
                <div className="ff">
                  <label className="fl">Status</label>
                  <select className="fsel2" value={statusPag} onChange={e=>setStatusPag(e.target.value)}>
                    <option value="em_aberto">Em aberto</option>
                    <option value="pago">Pago na hora</option>
                    <option value="parcelado">Parcelado</option>
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Observação</label>
                  <input className="fi" value={obsCompra} onChange={e=>setObsCompra(e.target.value)} placeholder="Opcional..."/>
                </div>
              </div>

              {itens.length>0 && (
                <div className="total-box">
                  <span className="total-label">Total da compra</span>
                  <span className="total-val">{fmtBRL(totalCompra)}</span>
                </div>
              )}
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCompra} disabled={saving||itens.length===0}>{saving?'Registrando...':'Confirmar Compra'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CLIENTE ── */}
      {modal==='cliente' && selected && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="mhd">
              <div><div className="mtitle">Novo Cliente</div><div className="msub">{selected.nome}</div></div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="ff"><label className="fl">Nome *</label><input className="fi" value={formCli.nome} onChange={e=>setFormCli(f=>({...f,nome:e.target.value}))} placeholder="Nome do cliente"/></div>
              <div className="ff"><label className="fl">Telefone</label><input className="fi" value={formCli.telefone} onChange={e=>setFormCli(f=>({...f,telefone:e.target.value}))} placeholder="(11) 99999-9999"/></div>
              <div className="ff"><label className="fl">Observação</label><input className="fi" value={formCli.observacao} onChange={e=>setFormCli(f=>({...f,observacao:e.target.value}))} placeholder="Opcional..."/></div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCliente} disabled={saving}>{saving?'Salvando...':'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REPASSE ── */}
      {modal==='repasse' && selected && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="mhd">
              <div><div className="mtitle">Registrar Repasse</div><div className="msub">{selected.nome}</div></div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}
              <div className="ff"><label className="fl">Valor (R$) *</label><input className="fi" type="number" min="0" step="0.01" value={repasseVal} onChange={e=>setRepasseVal(e.target.value)} placeholder="0,00"/></div>
              <div className="ff"><label className="fl">Observação</label><input className="fi" value={repasseObs} onChange={e=>setRepasseObs(e.target.value)} placeholder="Ex: PIX, dinheiro..."/></div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarRepasse} disabled={saving}>{saving?'Registrando...':'Confirmar Repasse'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}