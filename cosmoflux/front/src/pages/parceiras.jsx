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
const fmtTel = t => t ? t.replace(/\D/g,'').replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3') : '—';
const COLORS = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757'];
const avatarColor = n => COLORS[(n?.charCodeAt(0)||0) % COLORS.length];
const PAGAMENTOS = ['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Boleto','Fiado','A combinar'];

const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus Jakarta Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
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
.card-mid4{padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;border-bottom:1px solid rgba(255,255,255,.05);}
.mini-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;}
.mini-val{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#e8eaed;}
.mini-val.yellow{color:#ffd32a;}
.mini-val.green{color:#00d4aa;}
.mini-val.purple{color:#a855f7;}
.card-bot{padding:10px 16px;display:flex;align-items:center;justify-content:flex-end;gap:6px;}
.icon-btn{width:28px;height:28px;border-radius:6px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);}
.icon-btn:hover{background:rgba(0,212,170,.1);color:#e8eaed;}
.icon-btn.danger:hover{background:rgba(255,71,87,.15);color:#ff4757;}

/* DETAIL PANEL */
.dp{position:fixed;right:0;top:0;bottom:0;width:460px;background:#0e1013;border-left:1px solid rgba(255,255,255,.08);z-index:150;overflow-y:auto;display:flex;flex-direction:column;animation:slideIn .3s cubic-bezier(.22,1,.36,1) both;}
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
.dp-kpis4{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.dp-kpi{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;}
.dp-kpi-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.dp-kpi-val{font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed;}
.dp-kpi-val.yellow{color:#ffd32a;}
.dp-kpi-val.green{color:#00d4aa;}
.dp-kpi-val.purple{color:#a855f7;}

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

/* Clientes */
.cli-block{background:#13161a;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;margin-bottom:8px;}
.cli-hdr{padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s;}
.cli-hdr:hover{background:rgba(255,255,255,.03);}
.cli-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000;flex-shrink:0;}
.cli-nome{font-size:13px;font-weight:600;color:#e8eaed;flex:1;}
.cli-tel{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);}
.cli-body{border-top:1px solid rgba(255,255,255,.06);padding:12px 14px;display:flex;flex-direction:column;gap:10px;}
.venda-row{background:#0e1013;border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:8px;}
.venda-desc{font-size:12px;font-weight:600;color:#e8eaed;flex:1;}
.venda-sub{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:2px;}
.venda-val{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#a855f7;white-space:nowrap;}
.cli-stats{display:flex;gap:8px;padding:4px 0 6px;}
.cli-stat-item{font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.35);}
.cli-stat-item span{color:#a855f7;font-weight:700;}

.dp-foot{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;flex-shrink:0;}

/* BADGE */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.b-green{background:rgba(0,212,170,.12);color:#00d4aa;}
.b-yellow{background:rgba(255,211,42,.12);color:#ffd32a;}
.b-red{background:rgba(255,71,87,.12);color:#ff4757;}
.b-gray{background:rgba(255,255,255,.07);color:rgba(232,234,237,.5);}
.b-purple{background:rgba(168,85,247,.12);color:#a855f7;}

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

/* modo toggle */
.modo-toggle{display:flex;gap:4px;background:rgba(255,255,255,.03);border-radius:9px;padding:4px;margin-bottom:4px;}
.modo-btn{flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;}

.btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-primary{background:#00d4aa;color:#000;}.btn-primary:hover{background:#00efc0;transform:translateY(-1px);}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-ghost{background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08);}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#e8eaed;}
.btn-danger{background:rgba(255,71,87,.08);color:#ff4757;border:1px solid rgba(255,71,87,.2);}
.btn-danger:hover{background:rgba(255,71,87,.18);}
.btn-purple{background:rgba(168,85,247,.1);color:#a855f7;border:1px solid rgba(168,85,247,.25);}
.btn-purple:hover{background:rgba(168,85,247,.18);}
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
  const [cliOpen,    setCliOpen]    = useState({});
  const [toast,      setToast]      = useState(null);

  // Modais
  const [modal, setModal] = useState(null); // 'parceira'|'compra'|'cliente'|'repasse'|'venda_cli'
  const [formPar,  setFormPar]  = useState(FORM_PAR_EMPTY);
  const [formCli,  setFormCli]  = useState(FORM_CLI_EMPTY);
  const [editando, setEditando] = useState(null);

  // Compra (parceira compra do estoque)
  const [itens,      setItens]      = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showDrop,   setShowDrop]   = useState(false);
  const [prodAdd,    setProdAdd]    = useState('');
  const [statusPag,  setStatusPag]  = useState('em_aberto');
  const [obsCompra,  setObsCompra]  = useState('');
  const [formErr,    setFormErr]    = useState('');
  const [saving,     setSaving]     = useState(false);

  // Repasse
  const [repasseCompra, setRepasseCompra] = useState(null);
  const [repasseVal,    setRepasseVal]    = useState('');
  const [repasseObs,    setRepasseObs]    = useState('');

  // Venda para cliente da parceira
  const [vendaCli,      setVendaCli]      = useState(null); // {id, nome} do ClienteParceira
  const [modoLivreVenda,setModoLivreVenda]= useState(false);
  const [valorLivreVenda,setValorLivreVenda] = useState('');
  const [descLivreVenda, setDescLivreVenda]  = useState('');
  const [itensVenda,     setItensVenda]      = useState([]);
  const [prodSearchV,    setProdSearchV]     = useState('');
  const [showDropV,      setShowDropV]       = useState(false);
  const [prodAddV,       setProdAddV]        = useState('');
  const [modoPagVenda,   setModoPagVenda]    = useState('PIX');
  const [obsVenda,       setObsVenda]        = useState('');

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

  // ── Itens da compra (parceira) ──────────────────────────────────
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

  // ── Itens da venda (cliente da parceira) ────────────────────────
  const addItemVenda = () => {
    const prod = produtos.find(p => p.id === parseInt(prodAddV));
    if (!prod) return;
    if (itensVenda.find(i => i.produto_id === prod.id)) {
      setItensVenda(prev => prev.map(i => i.produto_id===prod.id ? {...i,quantidade:i.quantidade+1} : i));
    } else {
      setItensVenda(prev => [...prev, { produto_id:prod.id, nome:prod.nome,
        estoque:prod.estoque_atual, unidade:prod.unidade,
        preco_unitario:prod.preco_venda, quantidade:1 }]);
    }
    setProdAddV(''); setProdSearchV('');
  };
  const updItemVenda = (id, field, val) => setItensVenda(prev => prev.map(i => i.produto_id===id ? {...i,[field]:val} : i));
  const delItemVenda = id => setItensVenda(prev => prev.filter(i => i.produto_id!==id));
  const totalVendaCli = itensVenda.reduce((a,i) => a + i.quantidade * parseFloat(i.preco_unitario||0), 0);

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

  // ── Salvar venda para cliente da parceira ──────────────────────
  const salvarVendaCli = async () => {
    if (!vendaCli || !selected) return;
    if (modoLivreVenda) {
      if (!valorLivreVenda || parseFloat(valorLivreVenda) <= 0) { setFormErr('Informe um valor válido'); return; }
    } else {
      if (itensVenda.length === 0) { setFormErr('Adicione ao menos 1 produto'); return; }
      for (const it of itensVenda) {
        if (it.quantidade < 1)          { setFormErr(`Quantidade inválida: ${it.nome}`); return; }
        if (it.quantidade > it.estoque) { setFormErr(`Estoque insuficiente: ${it.nome}`); return; }
      }
    }
    setSaving(true); setFormErr('');
    try {
      const body = modoLivreVenda
        ? { modo:'livre', descricao:descLivreVenda||null, valor_livre:parseFloat(valorLivreVenda), modo_pagamento:modoPagVenda, observacao:obsVenda||null }
        : { modo:'catalogo', itens:itensVenda.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,preco_unitario:parseFloat(i.preco_unitario)})), modo_pagamento:modoPagVenda, observacao:obsVenda||null };
      const res = await api.post(`/parceiras/${selected.id}/clientes/${vendaCli.id}/vendas`, body);
      showToast(`Venda registrada! Total: ${fmtBRL(res.total)}`);
      setModal(null);
      setItensVenda([]); setValorLivreVenda(''); setDescLivreVenda(''); setObsVenda(''); setModoPagVenda('PIX'); setModoLivreVenda(false);
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

  const totalSaldo          = parceiras.reduce((a,p) => a + p.saldo_em_aberto, 0);
  const totalVendasClientes = parceiras.reduce((a,p) => a + (p.total_vendas_clientes||0), 0);

  const statusBadge = s => {
    if (s==='pago')      return <span className="badge b-green">PAGO</span>;
    if (s==='parcelado') return <span className="badge b-yellow">PARCELADO</span>;
    return <span className="badge b-yellow">EM ABERTO</span>;
  };

  const abrirVendaCli = (cli) => {
    setVendaCli(cli);
    setItensVenda([]); setValorLivreVenda(''); setDescLivreVenda('');
    setModoLivreVenda(false); setObsVenda(''); setModoPagVenda('PIX');
    setProdAddV(''); setProdSearchV(''); setFormErr('');
    setModal('venda_cli');
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
            { label:'Parceiras',        val: parceiras.length,            color:'#00d4aa' },
            { label:'Saldo aberto',     val: fmtBRL(totalSaldo),          color:'#ffd32a', small:true },
            { label:'Com débito',       val: parceiras.filter(p=>p.saldo_em_aberto>0).length, color:'#ff6b35' },
            { label:'Vendas clientes',  val: fmtBRL(totalVendasClientes), color:'#a855f7', small:true },
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
                <div className="card-mid4">
                  <div><div className="mini-lbl">Compras</div><div className="mini-val">{p.num_compras}</div></div>
                  <div><div className="mini-lbl">Em aberto</div><div className={`mini-val ${p.saldo_em_aberto>0?'yellow':'green'}`}>{p.saldo_em_aberto>0?fmtBRL(p.saldo_em_aberto):'—'}</div></div>
                  <div><div className="mini-lbl">Clientes</div><div className="mini-val">{p.num_clientes}</div></div>
                  <div><div className="mini-lbl">Vendas clientes</div><div className={`mini-val ${p.total_vendas_clientes>0?'purple':''}`}>{p.total_vendas_clientes>0?fmtBRL(p.total_vendas_clientes):'—'}</div></div>
                </div>
                <div className="card-bot" onClick={e=>e.stopPropagation()}>
                  <button className="icon-btn" title="Editar" onClick={()=>{ setFormPar({nome:p.nome,telefone:p.telefone||'',email:p.email||'',observacao:p.observacao||''}); setEditando(p.id); setFormErr(''); setModal('parceira'); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button className="icon-btn danger" title="Remover" onClick={()=>deletarParceira(p.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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
                  <div className="dp-kpis4">
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Total compras</div><div className="dp-kpi-val" style={{fontSize:12}}>{fmtBRL(detalhe.total_compras)}</div></div>
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Repasses</div><div className="dp-kpi-val green" style={{fontSize:12}}>{fmtBRL(detalhe.total_repasses)}</div></div>
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Em aberto</div><div className={`dp-kpi-val ${detalhe.saldo_em_aberto>0?'yellow':'green'}`} style={{fontSize:12}}>{fmtBRL(detalhe.saldo_em_aberto)}</div></div>
                    <div className="dp-kpi"><div className="dp-kpi-lbl">Vendas clientes</div><div className="dp-kpi-val purple" style={{fontSize:12}}>{fmtBRL(detalhe.total_vendas_clientes||0)}</div></div>
                  </div>

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
                            <div>
                              <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'rgba(232,234,237,.28)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Produtos</div>
                              {c.itens.map((it,i)=>(
                                <div key={i} className="compra-item">
                                  <span className="compra-item-nome">{it.produto}</span>
                                  <span style={{color:'rgba(232,234,237,.35)',fontSize:11}}>{it.quantidade}x {fmtBRL(it.preco_unitario)}</span>
                                  <span style={{color:'#00d4aa',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{fmtBRL(it.subtotal)}</span>
                                </div>
                              ))}
                            </div>
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
                      <div key={cl.id} className="cli-block">
                        <div className="cli-hdr" onClick={()=>setCliOpen(o=>({...o,[cl.id]:!o[cl.id]}))}>
                          <div className="cli-dot" style={{background:avatarColor(cl.nome)}}>{cl.nome[0]?.toUpperCase()}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="cli-nome">{cl.nome}</div>
                            <div className="cli-tel">{fmtTel(cl.telefone)}</div>
                          </div>
                          {cl.total_vendas > 0 && (
                            <span className="badge b-purple" style={{marginRight:4}}>{fmtBRL(cl.total_vendas)}</span>
                          )}
                          <span style={{fontSize:11,color:'rgba(232,234,237,.3)',marginLeft:4}}>{cliOpen[cl.id]?'▲':'▼'}</span>
                        </div>
                        {cliOpen[cl.id] && (
                          <div className="cli-body">
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                              <div className="cli-stats">
                                <span className="cli-stat-item"><span>{cl.vendas.length}</span> venda(s)</span>
                                {cl.total_vendas>0 && <span className="cli-stat-item" style={{marginLeft:8}}>Total: <span>{fmtBRL(cl.total_vendas)}</span></span>}
                              </div>
                              <div style={{display:'flex',gap:6}}>
                                <button className="btn btn-purple btn-sm" onClick={()=>abrirVendaCli(cl)}>+ Venda</button>
                                <button className="icon-btn danger" onClick={()=>deletarCliente(selected.id,cl.id)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                </button>
                              </div>
                            </div>
                            {cl.vendas.length===0 ? (
                              <div style={{textAlign:'center',padding:'10px',color:'rgba(232,234,237,.2)',fontSize:11,fontFamily:'JetBrains Mono,monospace'}}>Nenhuma venda registrada</div>
                            ) : cl.vendas.map(v=>(
                              <div key={v.id} className="venda-row">
                                <div style={{flex:1,minWidth:0}}>
                                  <div className="venda-desc">{v.descricao || (v.itens?.length>0 ? v.itens.map(i=>i.produto).join(', ') : 'Venda')}</div>
                                  <div className="venda-sub">{v.criado_em}{v.modo_pagamento?` · ${v.modo_pagamento}`:''}</div>
                                </div>
                                <div className="venda-val">{fmtBRL(v.valor_total)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

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

      {/* ── MODAL VENDA CLIENTE PARCEIRA ── */}
      {modal==='venda_cli' && vendaCli && selected && (
        <div className="mbg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="mhd">
              <div>
                <div className="mtitle">Nova Venda</div>
                <div className="msub">{vendaCli.nome} · {selected.nome}</div>
              </div>
              <button className="mclose" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="mbody">
              {formErr && <div className="ferr">⚠ {formErr}</div>}

              {/* Toggle modo */}
              <div className="modo-toggle">
                <button className="modo-btn" onClick={()=>setModoLivreVenda(false)}
                  style={{background:!modoLivreVenda?'rgba(168,85,247,.15)':'transparent',color:!modoLivreVenda?'#a855f7':'rgba(232,234,237,.4)'}}>
                  📦 Produto do catálogo
                </button>
                <button className="modo-btn" onClick={()=>setModoLivreVenda(true)}
                  style={{background:modoLivreVenda?'rgba(255,211,42,.15)':'transparent',color:modoLivreVenda?'#ffd32a':'rgba(232,234,237,.4)'}}>
                  ✏ Valor livre
                </button>
              </div>

              {modoLivreVenda ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div className="ff">
                    <label className="fl">Descrição</label>
                    <input className="fi" placeholder="Ex: serviço, produto avulso..." value={descLivreVenda} onChange={e=>setDescLivreVenda(e.target.value)}/>
                  </div>
                  <div className="ff">
                    <label className="fl">Valor total (R$) *</label>
                    <input className="fi" type="number" min="0.01" step="0.01" placeholder="0,00"
                      style={{fontSize:18,fontWeight:700,fontFamily:'JetBrains Mono,monospace',borderColor:'rgba(168,85,247,.3)'}}
                      value={valorLivreVenda} onChange={e=>setValorLivreVenda(e.target.value)} autoFocus/>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sec-title">Produtos</div>
                  <div className="prod-search-wrap">
                    <input className="prod-search-input" placeholder="Buscar produto por nome ou SKU..."
                      value={prodSearchV}
                      onChange={e=>{ setProdSearchV(e.target.value); setShowDropV(true); setProdAddV(''); }}
                      onFocus={()=>setShowDropV(true)}
                      onBlur={()=>setTimeout(()=>setShowDropV(false),150)}
                    />
                    {showDropV && (
                      <div className="prod-dropdown">
                        {produtos.filter(p=>!itensVenda.find(i=>i.produto_id===p.id)&&(!prodSearchV||p.nome.toLowerCase().includes(prodSearchV.toLowerCase())||(p.sku||'').toLowerCase().includes(prodSearchV.toLowerCase()))).slice(0,20).map(p=>(
                          <div key={p.id} className="prod-opt" onMouseDown={()=>{ setProdAddV(String(p.id)); setProdSearchV(p.nome); setShowDropV(false); }}>
                            <div className="prod-opt-nome">{p.nome}</div>
                            <div className="prod-opt-sub">{p.sku?`SKU: ${p.sku} · `:''}estoque: {p.estoque_atual} {p.unidade} · {fmtBRL(p.preco_venda)}</div>
                          </div>
                        ))}
                        {produtos.filter(p=>!itensVenda.find(i=>i.produto_id===p.id)&&(!prodSearchV||p.nome.toLowerCase().includes(prodSearchV.toLowerCase())||(p.sku||'').toLowerCase().includes(prodSearchV.toLowerCase()))).length===0 && <div className="prod-opt-empty">Nenhum produto encontrado</div>}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-start'}} onClick={addItemVenda} disabled={!prodAddV}>+ Adicionar</button>

                  {itensVenda.length>0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {itensVenda.map(it=>(
                        <div key={it.produto_id} className="item-row">
                          <div><div style={{fontSize:13,fontWeight:600,color:'#e8eaed'}}>{it.nome}</div><div style={{fontSize:10,color:'rgba(232,234,237,.35)',fontFamily:'JetBrains Mono,monospace'}}>estoque: {it.estoque} {it.unidade}</div></div>
                          <input className="item-input" type="number" min="1" max={it.estoque} value={it.quantidade} onChange={e=>updItemVenda(it.produto_id,'quantidade',parseInt(e.target.value)||1)} placeholder="Qtd"/>
                          <input className="item-input" type="number" min="0" step="0.01" value={it.preco_unitario} onChange={e=>updItemVenda(it.produto_id,'preco_unitario',e.target.value)} placeholder="Preço"/>
                          <button className="item-del" onClick={()=>delItemVenda(it.produto_id)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="sec-title">Pagamento</div>
              <div className="ff">
                <label className="fl">Forma de pagamento</label>
                <select className="fsel2" value={modoPagVenda} onChange={e=>setModoPagVenda(e.target.value)}>
                  {PAGAMENTOS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="ff">
                <label className="fl">Observação</label>
                <input className="fi" value={obsVenda} onChange={e=>setObsVenda(e.target.value)} placeholder="Opcional..."/>
              </div>

              {(!modoLivreVenda && itensVenda.length>0) && (
                <div className="total-box">
                  <span className="total-label">Total da venda</span>
                  <span className="total-val">{fmtBRL(totalVendaCli)}</span>
                </div>
              )}
              {(modoLivreVenda && parseFloat(valorLivreVenda)>0) && (
                <div className="total-box" style={{background:'rgba(168,85,247,.05)',borderColor:'rgba(168,85,247,.12)'}}>
                  <span className="total-label">Total da venda</span>
                  <span className="total-val" style={{color:'#a855f7'}}>{fmtBRL(parseFloat(valorLivreVenda))}</span>
                </div>
              )}
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarVendaCli} disabled={saving||(modoLivreVenda?!valorLivreVenda:itensVenda.length===0)}>
                {saving?'Registrando...':'Confirmar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}
