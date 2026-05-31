import { useState, useEffect, useCallback } from 'react';

// ── API helpers ───────────────────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const apiCall = async (url, opts={}) => {
  const r = await fetch(BASE + url, { headers: h(), ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw { status: r.status, detail: data.detail || `Erro ${r.status}` };
  return data;
};
const api = {
  get:   (url)       => apiCall(url),
  post:  (url, body) => apiCall(url, { method:'POST',  body: JSON.stringify(body) }),
  put:   (url, body) => apiCall(url, { method:'PUT',   body: JSON.stringify(body) }),
  patch: (url, body) => apiCall(url, { method:'PATCH', body: JSON.stringify(body) }),
  del:   (url)       => apiCall(url, { method:'DELETE' }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const fmtTel = t => t ? t.replace(/\D/g,'').replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3') : '—';
const hoje = () => new Date().toISOString().split('T')[0];

const MODOS = ['Dinheiro','PIX','Cartão Crédito','Cartão Débito','Boleto','Fiado'];

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.cl-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'Syne', sans-serif;
  color: #e8eaed;
  animation: clFadeIn .35s ease both;
}
@keyframes clFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

/* ── ALERTAS BANNER ── */
.alert-banner {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid;
  animation: clFadeIn .4s ease both;
}
.alert-banner.danger { border-color: rgba(255,71,87,.3); background: rgba(255,71,87,.06); }
.alert-banner.warn   { border-color: rgba(255,211,42,.3); background: rgba(255,211,42,.06); }

.ab-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  cursor: pointer; user-select: none;
}
.ab-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
.ab-title { font-size:13px;font-weight:700;flex:1; }
.ab-count {
  font-size:11px; font-family:'JetBrains Mono',monospace;
  padding:2px 8px; border-radius:4px;
}
.alert-banner.danger .ab-count { background:rgba(255,71,87,.15);color:#ff4757; }
.alert-banner.warn   .ab-count { background:rgba(255,211,42,.15);color:#ffd32a; }
.ab-chevron { font-size:12px; transition: transform .2s; color: rgba(232,234,237,.4); }
.ab-chevron.open { transform: rotate(180deg); }

.ab-list { border-top:1px solid rgba(255,255,255,.06); }
.ab-item {
  display:flex; align-items:center; gap:12px;
  padding:10px 16px;
  border-bottom:1px solid rgba(255,255,255,.04);
  font-size:12px;
}
.ab-item:last-child { border-bottom:none; }
.ab-item-name { font-weight:600; color:#e8eaed; flex:1; }
.ab-item-info { font-family:'JetBrains Mono',monospace; font-size:11px; color:rgba(232,234,237,.4); }
.ab-item-val  { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600; }
.danger .ab-item-val { color:#ff4757; }
.warn   .ab-item-val { color:#ffd32a; }
.ab-badge {
  font-size:10px; font-family:'JetBrains Mono',monospace;
  padding:2px 7px; border-radius:4px; white-space:nowrap;
}
.alert-banner.danger .ab-badge { background:rgba(255,71,87,.15);color:#ff4757; }
.alert-banner.warn   .ab-badge { background:rgba(255,211,42,.15);color:#ffd32a; }

/* ── HEADER ── */
.cl-header { display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap; }
.cl-title   { font-size:22px;font-weight:800;color:#e8eaed; }
.cl-sub     { font-size:12px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:4px; }

/* ── STATS ── */
.cl-stats { display:flex;gap:12px;flex-wrap:wrap; }
.cl-stat {
  background:#0e1013; border:1px solid rgba(255,255,255,.06);
  border-radius:8px; padding:10px 16px;
  display:flex; align-items:center; gap:10px;
  flex:1; min-width:130px;
}
.cs-dot  { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
.cs-val  { font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#e8eaed; }
.cs-lbl  { font-size:11px;color:rgba(232,234,237,.35);margin-top:1px; }

/* ── FILTRO ── */
.cl-filters { display:flex;gap:10px;flex-wrap:wrap;align-items:center; }
.cl-search {
  display:flex;align-items:center;gap:8px;
  background:#0e1013; border:1px solid rgba(255,255,255,.08);
  border-radius:8px; padding:9px 14px; flex:1; min-width:200px;
  transition:border-color .2s;
}
.cl-search:focus-within { border-color:rgba(0,212,170,.4); }
.cl-search input {
  background:none;border:none;outline:none;
  font-size:13px;color:#e8eaed;font-family:'Syne',sans-serif;width:100%;
}
.cl-search input::placeholder { color:rgba(232,234,237,.25); }
.cl-sel {
  background:#0e1013; border:1px solid rgba(255,255,255,.08);
  border-radius:8px; padding:9px 14px;
  font-size:13px;color:rgba(232,234,237,.7);
  font-family:'Syne',sans-serif;outline:none;cursor:pointer;
}

/* ── GRID CLIENTES ── */
.cl-grid {
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(300px,1fr));
  gap:14px;
}

.cl-card {
  background:#0e1013;
  border:1px solid rgba(255,255,255,.06);
  border-radius:12px; overflow:hidden;
  transition:border-color .2s, transform .2s, box-shadow .2s;
  animation:cardIn .4s cubic-bezier(.22,1,.36,1) both;
  cursor:pointer; position:relative;
}
.cl-card:hover { border-color:rgba(255,255,255,.12); transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.3); }
.cl-card.selected { border-color:rgba(0,212,170,.4); box-shadow:0 0 0 1px rgba(0,212,170,.15); }
.cl-card.alerta-danger { border-color:rgba(255,71,87,.35); }
.cl-card.alerta-warn   { border-color:rgba(255,211,42,.3); }
@keyframes cardIn { from{opacity:0;transform:translateY(14px) scale(.98)} to{opacity:1;transform:none} }

.cl-card-alert-strip {
  height:3px; width:100%;
}

.cl-card-top { padding:16px 16px 12px; border-bottom:1px solid rgba(255,255,255,.05); }
.cl-card-avatar {
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:800;color:#000;
  flex-shrink:0; margin-bottom:10px;
}
.cl-card-name { font-size:15px;font-weight:700;color:#e8eaed;margin-bottom:3px; }
.cl-card-tel  { font-size:12px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.4); }
.cl-card-end  { font-size:11px;color:rgba(232,234,237,.3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.cl-card-badges { display:flex;gap:6px;flex-wrap:wrap;margin-top:8px; }

.cl-card-mid {
  padding:12px 16px;
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:10px; border-bottom:1px solid rgba(255,255,255,.05);
}
.cl-mini-lbl { font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px; }
.cl-mini-val { font-size:13px;font-weight:700;color:#e8eaed;font-family:'JetBrains Mono',monospace; }
.cl-mini-val.green  { color:#00d4aa; }
.cl-mini-val.red    { color:#ff4757; }
.cl-mini-val.yellow { color:#ffd32a; }

.cl-card-bot {
  padding:10px 16px;
  display:flex;align-items:center;justify-content:space-between;
}
.cl-vendedor { font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3); }
.cl-actions  { display:flex;gap:6px; }

/* ── ICON BTN ── */
.icon-btn {
  width:28px;height:28px;border-radius:6px;border:none;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .15s;
  background:rgba(255,255,255,.04);color:rgba(232,234,237,.4);
}
.icon-btn:hover               { background:rgba(255,255,255,.09);color:#e8eaed; }
.icon-btn.danger:hover        { background:rgba(255,71,87,.15);color:#ff4757; }

/* ── EMPTY ── */
.cl-empty { grid-column:1/-1;padding:60px 20px;text-align:center;color:rgba(232,234,237,.25); }
.cl-empty-icon { font-size:36px;margin-bottom:12px;opacity:.4; }

/* ── SKELETON ── */
.skel {
  background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;
}
@keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

/* ── BADGE ── */
.badge {
  display:inline-flex;align-items:center;
  padding:2px 7px;border-radius:4px;
  font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;
}
.b-green  { background:rgba(0,212,170,.12);color:#00d4aa; }
.b-red    { background:rgba(255,71,87,.12);color:#ff4757; }
.b-yellow { background:rgba(255,211,42,.12);color:#ffd32a; }
.b-blue   { background:rgba(0,153,255,.12);color:#0099ff; }
.b-gray   { background:rgba(255,255,255,.07);color:rgba(232,234,237,.5); }

/* ── DETAIL PANEL ── */
.dp {
  position:fixed;right:0;top:0;bottom:0;
  width:420px;background:#0e1013;
  border-left:1px solid rgba(255,255,255,.08);
  z-index:150;overflow-y:auto;
  animation:dpIn .3s cubic-bezier(.22,1,.36,1) both;
  display:flex;flex-direction:column;
}
.dp::-webkit-scrollbar{width:4px}
.dp::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
@keyframes dpIn { from{transform:translateX(100%)} to{transform:none} }

.dp-head {
  padding:22px;border-bottom:1px solid rgba(255,255,255,.06);
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  flex-shrink:0;
}
.dp-avatar {
  width:48px;height:48px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:800;color:#000;
  flex-shrink:0;
}
.dp-name { font-size:18px;font-weight:800;color:#e8eaed;line-height:1.3; }
.dp-meta { font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);margin-top:3px; }

.dp-body  { padding:20px 22px;flex:1;display:flex;flex-direction:column;gap:22px; }
.dp-sec-title {
  font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:12px;
}
.dp-grid2 { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
.dp-field-lbl { font-size:10px;color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;margin-bottom:3px; }
.dp-field-val { font-size:14px;font-weight:600;color:#e8eaed; }
.dp-field-val.mono { font-family:'JetBrains Mono',monospace; }
.dp-field-val.green { color:#00d4aa; }
.dp-field-val.red   { color:#ff4757; }
.dp-field-val.yellow{ color:#ffd32a; }

/* Vendas accordion */
.venda-block {
  background:#13161a;border:1px solid rgba(255,255,255,.06);
  border-radius:10px;overflow:hidden;
}
.venda-header {
  padding:12px 14px;cursor:pointer;
  display:flex;align-items:center;gap:10px;
  transition:background .15s;
}
.venda-header:hover { background:rgba(255,255,255,.03); }
.venda-desc  { font-size:13px;font-weight:600;color:#e8eaed;flex:1; }
.venda-total { font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00d4aa; }

.venda-body { border-top:1px solid rgba(255,255,255,.06); }
.venda-info { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.04); }
.vi-lbl { font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px; }
.vi-val { font-size:13px;font-weight:600;color:#e8eaed; }

/* Parcelas */
.parcela-row {
  display:flex;align-items:center;gap:10px;
  padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.03);
  transition:background .15s;
}
.parcela-row:last-child { border-bottom:none; }
.parcela-row:hover { background:rgba(255,255,255,.02); }
.parc-num  { font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.3);width:28px; }
.parc-venc { font-size:12px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.5);flex:1; }
.parc-val  { font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#e8eaed; }
.parc-pay-btn {
  padding:3px 10px;border-radius:5px;border:none;
  font-size:10px;font-family:'JetBrains Mono',monospace;font-weight:600;
  cursor:pointer;transition:all .15s;
  background:rgba(0,212,170,.12);color:#00d4aa;
}
.parc-pay-btn:hover { background:rgba(0,212,170,.25); }
.parc-pay-btn:disabled { opacity:.4;cursor:not-allowed; }

.dp-foot {
  padding:14px 22px;border-top:1px solid rgba(255,255,255,.06);
  display:flex;gap:10px;flex-shrink:0;
}

/* ── MODAL ── */
.modal-bg {
  position:fixed;inset:0;
  background:rgba(0,0,0,.75);backdrop-filter:blur(4px);
  z-index:200;display:flex;align-items:center;justify-content:center;
  padding:20px;animation:clFadeIn .2s ease both;
}
.modal {
  background:#0e1013;border:1px solid rgba(255,255,255,.1);
  border-radius:16px;width:100%;max-width:560px;
  max-height:90vh;overflow-y:auto;
  animation:modalIn .3s cubic-bezier(.22,1,.36,1) both;
}
.modal::-webkit-scrollbar{width:4px}
.modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(14px)}to{opacity:1;transform:none}}

.modal-head {
  padding:22px 24px 18px;border-bottom:1px solid rgba(255,255,255,.06);
  display:flex;align-items:center;justify-content:space-between;
}
.modal-title { font-size:16px;font-weight:800;color:#e8eaed; }
.modal-sub   { font-size:11px;color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;margin-top:2px; }
.modal-close {
  width:32px;height:32px;border-radius:8px;border:none;
  background:rgba(255,255,255,.05);color:rgba(232,234,237,.5);
  cursor:pointer;transition:all .15s;
  display:flex;align-items:center;justify-content:center;font-size:18px;
}
.modal-close:hover { background:rgba(255,71,87,.15);color:#ff4757; }

.modal-body { padding:22px 24px;display:flex;flex-direction:column;gap:16px; }
.modal-foot {
  padding:14px 24px;border-top:1px solid rgba(255,255,255,.06);
  display:flex;gap:10px;justify-content:flex-end;
}

/* ── FORM ── */
.form-row2 { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
.form-row3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px; }
.form-field { display:flex;flex-direction:column;gap:5px; }
.form-field.full { grid-column:1/-1; }
.form-lbl {
  font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(232,234,237,.35);font-family:'JetBrains Mono',monospace;
}
.form-inp, .form-sel, .form-ta {
  background:#13161a;border:1px solid rgba(255,255,255,.08);
  border-radius:8px;padding:10px 14px;
  font-size:13px;color:#e8eaed;
  font-family:'Syne',sans-serif;outline:none;
  transition:border-color .2s,box-shadow .2s;width:100%;
}
.form-inp::placeholder { color:rgba(232,234,237,.2); }
.form-inp:focus,.form-sel:focus,.form-ta:focus {
  border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.08);
}
.form-sel option { background:#0e1013; }
.form-ta { resize:vertical;min-height:72px; }

.form-divider {
  border:none;border-top:1px solid rgba(255,255,255,.06);margin:4px 0;
}
.form-section-lbl {
  font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(232,234,237,.28);font-family:'JetBrains Mono',monospace;
  padding-bottom:4px;
}

/* parcelas preview */
.parc-preview {
  background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.12);
  border-radius:8px;padding:12px 14px;display:flex;gap:20px;
}
.pp-item-lbl { font-size:9px;font-family:'JetBrains Mono',monospace;color:rgba(232,234,237,.28);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px; }
.pp-item-val { font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#00d4aa; }

.form-err {
  background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);
  border-radius:8px;padding:10px 14px;font-size:12px;
  color:#ff4757;font-family:'JetBrains Mono',monospace;
}

/* ── BTNS ── */
.btn {
  display:flex;align-items:center;gap:6px;
  padding:9px 18px;border-radius:8px;border:none;
  font-family:'Syne',sans-serif;font-size:13px;font-weight:600;
  cursor:pointer;transition:all .15s;white-space:nowrap;
}
.btn-primary { background:#00d4aa;color:#000; }
.btn-primary:hover { background:#00efc0;transform:translateY(-1px); }
.btn-primary:disabled { opacity:.5;cursor:not-allowed;transform:none; }
.btn-ghost   { background:rgba(255,255,255,.05);color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.08); }
.btn-ghost:hover { background:rgba(255,255,255,.09);color:#e8eaed; }
.btn-danger  { background:rgba(255,71,87,.12);color:#ff4757;border:1px solid rgba(255,71,87,.2); }
.btn-danger:hover { background:rgba(255,71,87,.2); }
.btn-outline { background:transparent;color:rgba(232,234,237,.6);border:1px solid rgba(255,255,255,.12); }
.btn-outline:hover { background:rgba(255,255,255,.05);color:#e8eaed; }

/* ── TOAST ── */
.toast {
  position:fixed;bottom:24px;right:24px;
  background:#0e1013;border:1px solid rgba(255,255,255,.1);
  border-radius:10px;padding:13px 18px;
  display:flex;align-items:center;gap:10px;
  font-size:13px;color:#e8eaed;z-index:300;
  animation:toastIn .3s cubic-bezier(.22,1,.36,1) both;
  box-shadow:0 8px 28px rgba(0,0,0,.4);min-width:220px;
}
@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* ── CONFIRM ── */
.confirm {
  background:#0e1013;border:1px solid rgba(255,255,255,.1);
  border-radius:12px;padding:24px;max-width:340px;width:100%;
  animation:modalIn .2s ease both;
}
.confirm-title { font-size:16px;font-weight:700;color:#e8eaed;margin-bottom:8px; }
.confirm-text  { font-size:13px;color:rgba(232,234,237,.5);line-height:1.6;margin-bottom:20px; }
.confirm-acts  { display:flex;gap:10px;justify-content:flex-end; }

/* OVERLAY */
.overlay { position:fixed;inset:0;z-index:140; }

/* ── RESPONSIVE ── */
@media(max-width:768px){
  .cl-page{padding:14px;gap:14px}
  .form-row2,.form-row3{grid-template-columns:1fr}
  .dp{width:100%}
  .cl-grid{grid-template-columns:1fr}
}
`;

// ── AVATAR COLOR ─────────────────────────────────────────────────────────────
const COLORS = ['#00d4aa','#0099ff','#a855f7','#ff6b35','#ffd32a','#ff4757','#00b3de'];
const avatarColor = name => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

// ── ALERT BANNER ─────────────────────────────────────────────────────────────
function AlertBanner({ items, type }) {
  const [open, setOpen] = useState(true);
  if (!items.length) return null;
  const isDanger = type === 'danger';
  return (
    <div className={`alert-banner ${type}`}>
      <div className="ab-header" onClick={() => setOpen(o => !o)}>
        <div className="ab-dot" style={{ background: isDanger ? '#ff4757' : '#ffd32a' }} />
        <div className="ab-title" style={{ color: isDanger ? '#ff4757' : '#ffd32a' }}>
          {isDanger ? '⚠ Pagamentos Vencidos' : '⏰ Vencem em Breve'}
        </div>
        <span className="ab-count">{items.length}</span>
        <span className={`ab-chevron${open ? ' open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="ab-list">
          {items.map((it, i) => (
            <div key={i} className="ab-item">
              <span className="ab-badge">
                {isDanger ? `${it.dias}d atrasado` : `${it.dias}d restante`}
              </span>
              <span className="ab-item-name">{it.cliente}</span>
              <span className="ab-item-info">{it.descricao || `Parcela ${it.numero}`}</span>
              <span className="ab-item-val">{fmtBRL(it.valor)}</span>
              {it.cliente_tel && (
                <a href={`https://wa.me/55${it.cliente_tel.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:'#25d366', textDecoration:'none', whiteSpace:'nowrap' }}>
                  WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FORM VENDA ────────────────────────────────────────────────────────────────
const VENDA_EMPTY = {
  descricao:'', valor_total:'', modo_pagamento:'PIX',
  parcelado:false, num_parcelas:'1', data_vencimento:'', observacao:'',
};

function ModalVenda({ clienteId, clienteNome, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(VENDA_EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valParcela = form.valor_total && form.num_parcelas > 1
    ? (parseFloat(form.valor_total) / parseInt(form.num_parcelas)).toFixed(2)
    : null;

  const save = async () => {
    if (!form.valor_total || !form.modo_pagamento || !form.data_vencimento) {
      setErr('Valor, modo de pagamento e data de vencimento são obrigatórios.'); return;
    }
    setSaving(true); setErr('');
    try {
      await api.post('/vendas', {
        cliente_id: clienteId,
        descricao: form.descricao || null,
        valor_total: parseFloat(form.valor_total),
        modo_pagamento: form.modo_pagamento,
        parcelado: form.parcelado,
        num_parcelas: form.parcelado ? parseInt(form.num_parcelas) : 1,
        data_vencimento: form.data_vencimento,
        observacao: form.observacao || null,
      });
      showToast('Venda registrada!', '✓');
      onSaved();
    } catch (e) {
      setErr('Erro ao registrar venda.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">Nova Venda</div>
            <div className="modal-sub">Cliente: {clienteNome}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {err && <div className="form-err">⚠ {err}</div>}

          <div className="form-field">
            <label className="form-lbl">Descrição da venda</label>
            <input className="form-inp" placeholder="Ex: Creme hidratante + sérum vitamina C"
              value={form.descricao} onChange={e => F('descricao', e.target.value)} />
          </div>

          <div className="form-row2">
            <div className="form-field">
              <label className="form-lbl">Valor Total (R$) *</label>
              <input className="form-inp" type="number" step="0.01" min="0" placeholder="0,00"
                value={form.valor_total} onChange={e => F('valor_total', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-lbl">Modo de Pagamento *</label>
              <select className="form-sel" value={form.modo_pagamento} onChange={e => F('modo_pagamento', e.target.value)}>
                {MODOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row2">
            <div className="form-field">
              <label className="form-lbl">Data de Vencimento *</label>
              <input className="form-inp" type="date" min={hoje()}
                value={form.data_vencimento} onChange={e => F('data_vencimento', e.target.value)} />
            </div>
            <div className="form-field" style={{ justifyContent:'flex-end' }}>
              <label className="form-lbl">Parcelado?</label>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, color:'rgba(232,234,237,.7)' }}>
                  <input type="checkbox" checked={form.parcelado}
                    onChange={e => F('parcelado', e.target.checked)}
                    style={{ accentColor:'#00d4aa', width:15, height:15 }} />
                  Sim, parcelar
                </label>
              </div>
            </div>
          </div>

          {form.parcelado && (
            <div className="form-row2">
              <div className="form-field">
                <label className="form-lbl">Número de Parcelas</label>
                <select className="form-sel" value={form.num_parcelas} onChange={e => F('num_parcelas', e.target.value)}>
                  {[2,3,4,5,6,7,8,9,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
              {valParcela && (
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                  <div className="parc-preview">
                    <div>
                      <div className="pp-item-lbl">Cada parcela</div>
                      <div className="pp-item-val">{fmtBRL(valParcela)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-field">
            <label className="form-lbl">Observações</label>
            <textarea className="form-ta" placeholder="Notas adicionais..."
              value={form.observacao} onChange={e => F('observacao', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Venda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FORM CLIENTE ──────────────────────────────────────────────────────────────
const CLI_EMPTY = {
  nome:'', email:'', telefone:'', cpf:'',
  endereco:'', cidade:'', cep:'', observacao:'',
};

function ModalCliente({ inicial, onClose, onSaved, showToast }) {
  const isEdit = !!inicial?.id;
  const [form, setForm] = useState(inicial
    ? { nome:inicial.nome||'', email:inicial.email||'', telefone:inicial.telefone||'',
        cpf:inicial.cpf||'', endereco:inicial.endereco||'', cidade:inicial.cidade||'',
        cep:inicial.cep||'', observacao:inicial.observacao||'' }
    : CLI_EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nome) { setErr('Nome é obrigatório.'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) {
        await api.put(`/clientes/${inicial.id}`, form);
        showToast('Cliente atualizado!', '✎');
      } else {
        await api.post('/clientes', form);
        showToast('Cliente cadastrado!', '✓');
      }
      onSaved();
    } catch { setErr('Erro ao salvar cliente.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</div>
            <div className="modal-sub">{isEdit ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {err && <div className="form-err">⚠ {err}</div>}

          <div className="form-section-lbl">Dados Pessoais</div>
          <div className="form-row2">
            <div className="form-field full">
              <label className="form-lbl">Nome Completo *</label>
              <input className="form-inp" placeholder="Ex: Maria Silva"
                value={form.nome} onChange={e => F('nome', e.target.value)} />
            </div>
          </div>
          <div className="form-row2">
            <div className="form-field">
              <label className="form-lbl">Telefone / WhatsApp</label>
              <input className="form-inp" placeholder="(11) 99999-9999"
                value={form.telefone} onChange={e => F('telefone', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-lbl">CPF</label>
              <input className="form-inp" placeholder="000.000.000-00"
                value={form.cpf} onChange={e => F('cpf', e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-lbl">E-mail</label>
            <input className="form-inp" type="email" placeholder="email@exemplo.com"
              value={form.email} onChange={e => F('email', e.target.value)} />
          </div>

          <hr className="form-divider" />
          <div className="form-section-lbl">Endereço</div>
          <div className="form-field">
            <label className="form-lbl">Endereço (Rua, número, bairro)</label>
            <input className="form-inp" placeholder="Rua das Flores, 123 - Centro"
              value={form.endereco} onChange={e => F('endereco', e.target.value)} />
          </div>
          <div className="form-row2">
            <div className="form-field">
              <label className="form-lbl">Cidade</label>
              <input className="form-inp" placeholder="São Paulo"
                value={form.cidade} onChange={e => F('cidade', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-lbl">CEP</label>
              <input className="form-inp" placeholder="00000-000"
                value={form.cep} onChange={e => F('cep', e.target.value)} />
            </div>
          </div>

          <hr className="form-divider" />
          <div className="form-field">
            <label className="form-lbl">Observações</label>
            <textarea className="form-ta" placeholder="Preferências, histórico, anotações..."
              value={form.observacao} onChange={e => F('observacao', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DETALHE CLIENTE ───────────────────────────────────────────────────────────
function DetalheCliente({ cliente, onClose, onEdit, onNovaVenda, onParcelaPaga }) {
  const [dados, setDados] = useState(null);
  const [vendaOpen, setVendaOpen] = useState({});
  const [pagando, setPagando] = useState(null);

  useEffect(() => {
    api.get(`/clientes/${cliente.id}`).then(setDados);
  }, [cliente.id]);

  const toggleVenda = id => setVendaOpen(s => ({ ...s, [id]: !s[id] }));

  const [modalAbat,   setModalAbat]   = useState(null); // { venda, parcelas_abertas, saldo_total }
  const [valorAbat,   setValorAbat]   = useState('');
  const [abatMsg,     setAbatMsg]     = useState({ text:'', type:'' }); // type: success|error
  const [aplicando,   setAplicando]   = useState(false);

  const abrirAbat = (venda) => {
    const abertas = (venda.parcelas || []).filter(p => !p.pago);
    const saldo = abertas.reduce((a, p) => a + (p.saldo_restante ?? p.valor), 0);
    setModalAbat({ venda, abertas, saldo_total: Math.round(saldo * 100) / 100 });
    setValorAbat('');
    setAbatMsg({ text:'', type:'' });
  };

  const aplicarAbatimento = async () => {
    if (!modalAbat || !valorAbat) return;
    const val = parseFloat(valorAbat);
    if (!val || val <= 0) return;
    if (val > modalAbat.saldo_total + 0.01) {
      setAbatMsg({ text: `Valor excede o saldo devedor de ${fmtBRL(modalAbat.saldo_total)}`, type:'error' });
      return;
    }
    setAplicando(true);
    setAbatMsg({ text:'', type:'' });
    try {
      // envia para a primeira parcela em aberto — o backend distribui automaticamente
      const primeiraAberta = modalAbat.abertas[0];
      const res = await api.patch(`/parcelas/${primeiraAberta.id}/pagar`, {
        data_pago: hoje(),
        valor_abatido: val,
      });
      const updated = await api.get(`/clientes/${cliente.id}`);
      setDados(updated);
      onParcelaPaga();
      const novoSaldo = res.saldo_total_restante ?? 0;
      if (novoSaldo <= 0.01) {
        setModalAbat(null);
      } else {
        // atualiza saldo no modal
        const abertas = (updated.vendas?.find(v=>v.id===modalAbat.venda.id)?.parcelas||[]).filter(p=>!p.pago);
        const saldo = abertas.reduce((a,p)=>a+(p.saldo_restante??p.valor),0);
        setModalAbat(prev=>({...prev, abertas, saldo_total: Math.round(saldo*100)/100}));
        setAbatMsg({ text: res.mensagem, type:'success' });
        setValorAbat('');
      }
    } catch(e) {
      const msg = e?.detail || e?.message || 'Erro ao aplicar abatimento';
      setAbatMsg({ text: msg, type:'error' });
    } finally { setAplicando(false); }
  };
  const [modalVenda,  setModalVenda]  = useState(null); // venda em edição
  const [editVenda,   setEditVenda]   = useState({});
  const [salvandoV,   setSalvandoV]   = useState(false);
  const [cancelando,  setCancelando]  = useState(null);

  const abrirEditVenda = (v) => {
    setModalVenda(v);
    setEditVenda({
      modo_pagamento:  v.modo_pagamento  || '',
      data_vencimento: v.data_vencimento_raw || '',
      observacao:      v.observacao      || '',
      descricao:       v.descricao       || '',
    });
  };

  const salvarVenda = async () => {
    if (!modalVenda) return;
    setSalvandoV(true);
    try {
      await api.patch(`/vendas/${modalVenda.id}`, editVenda);
      const updated = await api.get(`/clientes/${cliente.id}`);
      setDados(updated);
      setModalVenda(null);
      onParcelaPaga();
    } finally { setSalvandoV(false); }
  };

  const [confirmCancel, setConfirmCancel] = useState(null); // vendaId

  const cancelarVenda = async (vendaId) => {
    setCancelando(vendaId);
    setConfirmCancel(null);
    try {
      await api.patch(`/vendas/${vendaId}/cancelar`, {});
      const updated = await api.get(`/clientes/${cliente.id}`);
      setDados(updated);
      onParcelaPaga();
    } catch(e) {
      alert(e?.detail || 'Erro ao cancelar venda');
    } finally { setCancelando(null); }
  };

  const alterarVencParcela = async (parcId, novaData) => {
    await api.patch(`/parcelas/${parcId}/vencimento`, { data_vencimento: novaData });
    const updated = await api.get(`/clientes/${cliente.id}`);
    setDados(updated);
  };

  const pagarParcela = async (parcId) => {
    setPagando(parcId);
    try {
      await api.patch(`/parcelas/${parcId}/pagar`, { data_pago: hoje() });
      const updated = await api.get(`/clientes/${cliente.id}`);
      setDados(updated);
      onParcelaPaga();
    } finally { setPagando(null); }
  };

  const color = avatarColor(cliente.nome);

  return (
    <>
      <div className="overlay" onClick={onClose} />

      {/* Modal de abatimento — inline styles, sem dependência de CSS externo */}
      {modalAbat && (() => {
        const val = parseFloat(valorAbat) || 0;
        const excede = val > modalAbat.saldo_total + 0.01;
        const valido = val > 0 && !excede && !aplicando;
        const restante = Math.max(modalAbat.saldo_total - val, 0);
        return (
          <div
            onClick={e => { if (e.target === e.currentTarget) setModalAbat(null); }}
            style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.72)',backdropFilter:'blur(5px)'}}>
            <div
              onClick={e => e.stopPropagation()}
              style={{background:'#13161a',border:'1px solid rgba(255,255,255,.12)',borderRadius:16,width:'100%',maxWidth:420,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>

              {/* Header */}
              <div style={{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,fontSize:15,fontWeight:700,color:'#e8eaed'}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'rgba(255,211,42,.12)',border:'1px solid rgba(255,211,42,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#ffd32a'}}>◑</div>
                  Registrar Abatimento
                </div>
                <button onClick={() => setModalAbat(null)} style={{background:'none',border:'none',color:'rgba(232,234,237,.35)',cursor:'pointer',fontSize:22,lineHeight:1,padding:'2px 6px',borderRadius:6}}>×</button>
              </div>

              {/* Body */}
              <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>

                {/* Saldo box */}
                <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'14px 16px',display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'rgba(232,234,237,.4)',fontFamily:"'JetBrains Mono',monospace"}}>Venda</span>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:'#e8eaed'}}>{modalAbat.venda.descricao || `#${modalAbat.venda.id}`}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'rgba(232,234,237,.4)',fontFamily:"'JetBrains Mono',monospace"}}>Parcelas em aberto</span>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:'#e8eaed'}}>{modalAbat.abertas.length}</span>
                  </div>
                  <div style={{borderTop:'1px solid rgba(255,255,255,.06)',margin:'2px 0'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#e8eaed'}}>Saldo devedor total</span>
                    <span style={{fontSize:17,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:'#ff6b35'}}>{fmtBRL(modalAbat.saldo_total)}</span>
                  </div>
                  {/* Lista de parcelas */}
                  {modalAbat.abertas.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:3,maxHeight:110,overflowY:'auto',marginTop:2}}>
                      {modalAbat.abertas.map(p => (
                        <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.04)'}}>
                          <span style={{fontSize:11,color:'rgba(232,234,237,.45)',fontFamily:"'JetBrains Mono',monospace"}}>
                            {p.numero===0 ? 'Entrada' : `${p.numero}ª parcela`}{p.vencimento ? ` · ${p.vencimento}` : ''}
                          </span>
                          <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:'#ff6b35'}}>{fmtBRL(p.saldo_restante ?? p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace"}}>Valor a abater (R$)</div>
                  <input
                    type="number" min="0.01" step="0.01"
                    placeholder="0,00"
                    value={valorAbat}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => e.stopPropagation()}
                    onChange={e => setValorAbat(e.target.value)}
                    autoFocus
                    style={{
                      background:'#0a0c0f',
                      border:`1px solid ${excede?'rgba(255,71,87,.5)':val>0?'rgba(255,211,42,.4)':'rgba(255,255,255,.1)'}`,
                      borderRadius:10,padding:'13px 16px',fontSize:22,fontWeight:700,
                      color:'#e8eaed',fontFamily:"'JetBrains Mono',monospace",outline:'none',width:'100%',
                      boxShadow:val>0&&!excede?'0 0 0 3px rgba(255,211,42,.08)':excede?'0 0 0 3px rgba(255,71,87,.08)':'none',
                      transition:'border-color .2s, box-shadow .2s',
                    }}
                  />
                  {val > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontFamily:"'JetBrains Mono',monospace",padding:'0 2px',color:excede?'#ff4757':'rgba(232,234,237,.35)'}}>
                      <span>{excede ? '⚠ Valor excede o saldo devedor' : 'Saldo após abatimento'}</span>
                      {!excede && <span style={{color:'#00d4aa',fontWeight:700}}>{fmtBRL(restante)}</span>}
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {abatMsg.text && (
                  <div style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",borderRadius:8,padding:'10px 14px',textAlign:'center',lineHeight:1.5,color:abatMsg.type==='success'?'#00d4aa':'#ff4757',background:abatMsg.type==='success'?'rgba(0,212,170,.08)':'rgba(255,71,87,.08)',border:`1px solid ${abatMsg.type==='success'?'rgba(0,212,170,.2)':'rgba(255,71,87,.2)'}`}}>
                    {abatMsg.text}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',gap:10}}>
                <button
                  onClick={() => setModalAbat(null)}
                  style={{flex:1,padding:'10px',borderRadius:9,border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'rgba(232,234,237,.5)',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>
                  Cancelar
                </button>
                <button
                  disabled={!valido}
                  onClick={aplicarAbatimento}
                  style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px 16px',borderRadius:9,border:'none',cursor:valido?'pointer':'not-allowed',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,transition:'all .2s',background:valido?'linear-gradient(135deg,#ffd32a,#ff9500)':'rgba(255,255,255,.05)',color:valido?'#0d1117':'rgba(232,234,237,.2)'}}>
                  {aplicando ? (
                    <>
                      <span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1117',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>
                      Aplicando...
                    </>
                  ) : val > 0 && !excede ? `✓ Abater ${fmtBRL(val)}` : 'Informe o valor'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal edição de venda */}
      {modalVenda && (
        <div className="modal-ev">
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)'}} onClick={()=>setModalVenda(null)}/>
          <div className="modal-ev-box">
            <div className="modal-ev-title">
              <span>✎ Editar Venda #{modalVenda.id}</span>
              <button style={{background:'none',border:'none',color:'rgba(232,234,237,.4)',cursor:'pointer',fontSize:18}} onClick={()=>setModalVenda(null)}>×</button>
            </div>

            <div className="ev-field">
              <label className="ev-label">Descrição</label>
              <input className="ev-input" value={editVenda.descricao||''} onChange={e=>setEditVenda(s=>({...s,descricao:e.target.value}))} placeholder="Ex: Compra de produtos"/>
            </div>

            <div className="ev-field">
              <label className="ev-label">Forma de pagamento</label>
              <select className="ev-select" value={editVenda.modo_pagamento||''} onChange={e=>setEditVenda(s=>({...s,modo_pagamento:e.target.value}))}>
                {['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Fiado','Transferência','Boleto'].map(m=>(
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="ev-field">
              <label className="ev-label">Data de vencimento (redistribui parcelas em aberto)</label>
              <input type="date" className="ev-input" value={editVenda.data_vencimento||''} onChange={e=>setEditVenda(s=>({...s,data_vencimento:e.target.value}))}/>
            </div>

            <div className="ev-field">
              <label className="ev-label">Observação</label>
              <input className="ev-input" value={editVenda.observacao||''} onChange={e=>setEditVenda(s=>({...s,observacao:e.target.value}))} placeholder="Observação opcional"/>
            </div>

            <div className="ev-btns">
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setModalVenda(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{flex:2,justifyContent:'center'}} disabled={salvandoV} onClick={salvarVenda}>
                {salvandoV ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dp">
        <div className="dp-head">
          <div style={{ display:'flex', gap:12, alignItems:'flex-start', flex:1, minWidth:0 }}>
            <div className="dp-avatar" style={{ background: color }}>
              {cliente.nome[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="dp-name">{cliente.nome}</div>
              <div className="dp-meta">{fmtTel(cliente.telefone)}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                {cliente.alerta === 'vencido'  && <span className="badge b-red">VENCIDO</span>}
                {cliente.alerta === 'proximo'  && <span className="badge b-yellow">VENCE EM BREVE</span>}
                {cliente.total_em_aberto > 0   && <span className="badge b-blue">{fmtBRL(cliente.total_em_aberto)} em aberto</span>}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="dp-body">
          {/* Dados */}
          <div>
            <div className="dp-sec-title">Informações</div>
            <div className="dp-grid2">
              <div>
                <div className="dp-field-lbl">Telefone</div>
                <div className="dp-field-val mono">{fmtTel(dados?.telefone)}</div>
              </div>
              <div>
                <div className="dp-field-lbl">CPF</div>
                <div className="dp-field-val mono">{dados?.cpf || '—'}</div>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <div className="dp-field-lbl">E-mail</div>
                <div className="dp-field-val" style={{ fontSize:13 }}>{dados?.email || '—'}</div>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <div className="dp-field-lbl">Endereço</div>
                <div className="dp-field-val" style={{ fontSize:13 }}>{dados?.endereco || '—'}</div>
              </div>
              {dados?.cidade && (
                <div>
                  <div className="dp-field-lbl">Cidade</div>
                  <div className="dp-field-val" style={{ fontSize:13 }}>{dados.cidade}</div>
                </div>
              )}
              {dados?.cep && (
                <div>
                  <div className="dp-field-lbl">CEP</div>
                  <div className="dp-field-val mono">{dados.cep}</div>
                </div>
              )}
              {dados?.observacao && (
                <div style={{ gridColumn:'1/-1' }}>
                  <div className="dp-field-lbl">Observações</div>
                  <div style={{ fontSize:12, color:'rgba(232,234,237,.5)', lineHeight:1.6,
                    background:'rgba(255,255,255,.03)', borderRadius:7, padding:'10px 12px', marginTop:4 }}>
                    {dados.observacao}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo Financeiro — apenas vendas ativas (não canceladas, não 100% pagas) */}
          {dados?.vendas?.length > 0 && (() => {
            const vendasAtivas = dados.vendas.filter(v =>
              v.status_pagamento !== 'cancelado' && v.status_pagamento !== 'pago'
            );
            const todasCanceladas = dados.vendas.every(v => v.status_pagamento === 'cancelado');
            const todasPagas = dados.vendas.length > 0 &&
              dados.vendas.filter(v => v.status_pagamento !== 'cancelado').every(v => v.status_pagamento === 'pago');

            // sem compras ativas
            if (vendasAtivas.length === 0) {
              return (
                <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:'20px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background: todasPagas ? 'rgba(0,212,170,.12)' : 'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                    {todasPagas ? '✓' : '○'}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color: todasPagas ? '#00d4aa' : 'rgba(232,234,237,.4)'}}>
                      {todasPagas ? 'Tudo quitado!' : 'Sem compras ativas'}
                    </div>
                    <div style={{fontSize:11,color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                      {todasPagas ? 'Todas as vendas foram pagas' : 'Nenhuma venda em aberto no momento'}
                    </div>
                  </div>
                </div>
              );
            }

            const totalVendas = vendasAtivas.reduce((a,v) => a + v.valor_total, 0);
            const totalPago   = vendasAtivas.reduce((a,v) => {
              const pagas   = (v.parcelas||[]).filter(p=>p.pago).reduce((s,p)=>s+p.valor,0);
              const parciais = (v.parcelas||[]).filter(p=>!p.pago&&(p.valor_pago||0)>0).reduce((s,p)=>s+(p.valor_pago||0),0);
              return a + pagas + parciais;
            }, 0);
            const totalAberto = Math.max(totalVendas - totalPago, 0);
            const pct = totalVendas > 0 ? Math.min((totalPago/totalVendas)*100, 100) : 0;
            const vencidas = vendasAtivas.filter(v => v.status_pagamento === 'vencido').length;

            return (
              <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:'16px',marginBottom:16,display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace"}}>Resumo Financeiro</div>
                  <div style={{fontSize:10,color:'rgba(232,234,237,.25)',fontFamily:"'JetBrains Mono',monospace"}}>{vendasAtivas.length} venda(s) ativa(s)</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    <span style={{fontSize:10,color:'rgba(232,234,237,.35)',fontFamily:"'JetBrains Mono',monospace"}}>TOTAL</span>
                    <span style={{fontSize:15,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:'#e8eaed'}}>{fmtBRL(totalVendas)}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    <span style={{fontSize:10,color:'rgba(232,234,237,.35)',fontFamily:"'JetBrains Mono',monospace"}}>PAGO</span>
                    <span style={{fontSize:15,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:'#00d4aa'}}>{fmtBRL(totalPago)}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    <span style={{fontSize:10,color:'rgba(232,234,237,.35)',fontFamily:"'JetBrains Mono',monospace"}}>EM ABERTO</span>
                    <span style={{fontSize:15,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:totalAberto>0?'#ff6b35':'#00d4aa'}}>{fmtBRL(totalAberto)}</span>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <div style={{height:8,background:'rgba(255,255,255,.06)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#00d4aa,#0099ff)',borderRadius:4,transition:'width .6s ease'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:'rgba(232,234,237,.35)'}}>
                    <span>{pct.toFixed(0)}% quitado</span>
                    {vencidas > 0 && <span style={{color:'#ff4757'}}>⚠ {vencidas} venda(s) vencida(s)</span>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Vendas */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="dp-sec-title" style={{ marginBottom:0 }}>
                Vendas ({dados?.vendas?.filter(v=>v.status_pagamento!=='cancelado').length || 0}
                {dados?.vendas?.some(v=>v.status_pagamento==='cancelado') && (
                  <span style={{fontSize:10,color:'rgba(232,234,237,.3)',fontWeight:400,marginLeft:4}}>
                    + {dados.vendas.filter(v=>v.status_pagamento==='cancelado').length} cancelada(s)
                  </span>
                )})
              </div>
              <button className="btn btn-outline" style={{ padding:'5px 12px', fontSize:12 }} onClick={onNovaVenda}>
                + Nova Venda
              </button>
            </div>

            {!dados ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[1,2].map(i => <div key={i} className="skel" style={{ height:52 }} />)}
              </div>
            ) : dados.vendas?.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px', color:'rgba(232,234,237,.25)', fontSize:12, fontFamily:'JetBrains Mono, monospace' }}>
                Nenhuma venda registrada
              </div>
            ) : dados.vendas.map(v => {
              const cancelada = v.status_pagamento === 'cancelado';
              return (
              <div key={v.id} className="venda-block" style={{ marginBottom:10, opacity: cancelada ? 0.45 : 1, filter: cancelada ? 'grayscale(0.4)' : 'none', transition:'opacity .2s' }}>
                <div className="venda-header" onClick={() => !cancelada && toggleVenda(v.id)} style={{cursor: cancelada ? 'default' : 'pointer'}}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="venda-desc" style={{display:'flex',alignItems:'center',gap:6}}>
                      {v.descricao || `Venda #${v.id}`}
                      {v.status_pagamento === 'cancelado' && <span className="badge b-red" style={{fontSize:9}}>CANCELADA</span>}
                    </div>
                    <div style={{ fontSize:11, color:'rgba(232,234,237,.3)', fontFamily:'JetBrains Mono, monospace', marginTop:2, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span>{v.data_venda}</span>
                      <span>·</span>
                      <span>{v.modo_pagamento}</span>
                      {v.parcelado && <><span>·</span><span>{v.num_parcelas}x de {fmtBRL(v.valor_parcela)}</span></>}
                      {(() => {
                        const abertas = (v.parcelas||[]).filter(p=>!p.pago);
                        const saldo = abertas.reduce((a,p)=>a+(p.saldo_restante??p.valor),0);
                        if (saldo > 0 && v.status_pagamento !== 'cancelado') return (
                          <><span>·</span><span style={{color:'#ff6b35',fontWeight:700}}>saldo: {fmtBRL(saldo)}</span></>
                        );
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="venda-total">{fmtBRL(v.valor_total)}</div>
                  {v.status_pagamento !== 'cancelado' && (
                    <div style={{display:'flex',gap:4,marginLeft:8}} onClick={e=>e.stopPropagation()}>
                      <button className="parc-pay-btn" style={{padding:'3px 8px',fontSize:11,background:'rgba(0,153,255,.1)',color:'#0099ff'}}
                        onClick={() => abrirEditVenda(v)}>✎ Editar</button>
                      {confirmCancel === v.id ? (
                        <div style={{display:'flex',gap:4,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                          <span style={{fontSize:10,color:'rgba(232,234,237,.5)'}}>Confirmar?</span>
                          <button className="parc-pay-btn" style={{padding:'3px 8px',fontSize:11,background:'rgba(255,71,87,.2)',color:'#ff4757'}}
                            disabled={cancelando===v.id}
                            onClick={()=>cancelarVenda(v.id)}>
                            {cancelando===v.id?'...':'Sim'}
                          </button>
                          <button className="parc-pay-btn" style={{padding:'3px 8px',fontSize:11,background:'rgba(255,255,255,.06)',color:'rgba(232,234,237,.5)'}}
                            onClick={()=>setConfirmCancel(null)}>Não</button>
                        </div>
                      ) : (
                        <button className="parc-pay-btn" style={{padding:'3px 8px',fontSize:11,background:'rgba(255,71,87,.1)',color:'#ff4757'}}
                          disabled={cancelando===v.id}
                          onClick={()=>setConfirmCancel(v.id)}>
                          ✕ Cancelar
                        </button>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize:11, color:'rgba(232,234,237,.3)', marginLeft:4 }}>
                    {vendaOpen[v.id] ? '▲' : '▼'}
                  </span>
                </div>

                {vendaOpen[v.id] && !cancelada && (
                  <div className="venda-body">
                    {/* Resumo financeiro da venda */}
                    {(() => {
                      const totalParcelas = (v.parcelas||[]).length;
                      const pagas = (v.parcelas||[]).filter(p=>p.pago).length;
                      const totalPago = (v.parcelas||[]).reduce((a,p)=>a+(p.valor_pago||0),0);
                      const saldo = Math.max(v.valor_total - totalPago, 0);
                      const pct = v.valor_total > 0 ? Math.min((totalPago/v.valor_total)*100,100) : 0;
                      return (
                        <div style={{background:'rgba(255,255,255,.02)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',flexDirection:'column',gap:10}}>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                            <div>
                              <div style={{fontSize:9,color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>TOTAL</div>
                              <div style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:'#e8eaed'}}>{fmtBRL(v.valor_total)}</div>
                            </div>
                            <div>
                              <div style={{fontSize:9,color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>PAGO</div>
                              <div style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:'#00d4aa'}}>{fmtBRL(totalPago)}</div>
                            </div>
                            <div>
                              <div style={{fontSize:9,color:'rgba(232,234,237,.3)',fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>SALDO</div>
                              <div style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:saldo>0?'#ff6b35':'#00d4aa'}}>{fmtBRL(saldo)}</div>
                            </div>
                          </div>
                          {totalParcelas > 0 && (
                            <div style={{display:'flex',flexDirection:'column',gap:4}}>
                              <div style={{height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#00d4aa,#0099ff)',borderRadius:3,transition:'width .5s'}}/>
                              </div>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:'rgba(232,234,237,.3)'}}>
                                <span>{pagas}/{totalParcelas} parcelas pagas</span>
                                <span>{pct.toFixed(0)}% quitado</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="venda-info">
                      <div>
                        <div className="vi-lbl">Pagamento</div>
                        <div className="vi-val">{v.modo_pagamento}</div>
                      </div>
                      <div>
                        <div className="vi-lbl">Status Pgto.</div>
                        <div className="vi-val">
                          {v.status_pagamento === 'pago'      ? <span className="badge b-green">✓ PAGO</span>
                          :v.status_pagamento === 'cancelado' ? <span className="badge b-red">CANCELADO</span>
                          :v.status_pagamento === 'vencido'   ? <span className="badge b-red">VENCIDO</span>
                          :v.status_pagamento === 'em_aberto' ? <span className="badge b-yellow">EM ABERTO</span>
                          :                                     <span className="badge b-yellow">PENDENTE</span>}
                        </div>
                      </div>
                      <div>
                        <div className="vi-lbl">Entrega</div>
                        <div className="vi-val">
                          {v.status_entrega === 'entregue'         ? <span className="badge b-green">ENTREGUE</span>
                          :v.status_entrega === 'pendente_entrega' ? <span className="badge b-yellow">PENDENTE</span>
                          :v.status_entrega === 'cancelado'        ? <span className="badge b-red">CANCELADO</span>
                          :                                          <span className="badge b-gray">—</span>}
                        </div>
                      </div>
                      {v.data_vencimento && (
                        <div>
                          <div className="vi-lbl">Vencimento</div>
                          <div className="vi-val mono">{v.data_vencimento}</div>
                        </div>
                      )}
                      {v.desconto > 0 && (
                        <div>
                          <div className="vi-lbl">Desconto</div>
                          <div className="vi-val mono" style={{color:'#ff6b35'}}>- {fmtBRL(v.desconto)}</div>
                        </div>
                      )}
                      {v.observacao && (
                        <div style={{ gridColumn:'1/-1' }}>
                          <div className="vi-lbl">Obs.</div>
                          <div style={{fontSize:12,color:'rgba(232,234,237,.5)',background:'rgba(255,255,255,.03)',borderRadius:7,padding:'8px 10px',marginTop:2,lineHeight:1.5}}>{v.observacao}</div>
                        </div>
                      )}
                    </div>

                    {/* Parcelas */}
                    {v.parcelas?.length > 0 && (
                      <div>
                        {v.parcelas.map(p => {
                          const pct = p.valor > 0 ? Math.min(((p.valor_pago||0)/p.valor)*100, 100) : 0;
                          const parcial = !p.pago && (p.valor_pago||0) > 0;
                          const stBadge = p.pago ? 'b-green' : parcial ? 'b-yellow' : p.status === 'vencido' ? 'b-red' : p.status === 'proximo' ? 'b-yellow' : 'b-gray';
                          const stLabel = p.pago ? '✓ PAGO' : parcial ? '◑ PARCIAL' : p.status === 'vencido' ? 'VENCIDO' : p.status === 'proximo' ? 'EM BREVE' : 'EM ABERTO';
                          return (
                            <div key={p.id} className="parcela-row">
                              <span className="parc-num">{p.numero === 0 ? 'Entrada' : `${p.numero}ª`}</span>
                              {!p.pago && v.status_pagamento !== 'cancelado' ? (
                                <input type="date" className="parc-venc-edit"
                                  defaultValue={p.vencimento_raw || ''}
                                  onBlur={e => { if(e.target.value) alterarVencParcela(p.id, e.target.value); }}
                                  onClick={e=>e.stopPropagation()}
                                  title="Clique para alterar vencimento"/>
                              ) : (
                                <span className="parc-venc">{p.vencimento}</span>
                              )}
                              <span className={`badge ${stBadge}`}>{stLabel}</span>
                              <span className="parc-val" style={{marginLeft:'auto'}}>
                                {parcial ? (
                                  <span>
                                    <span style={{color:'#ffd32a'}}>{fmtBRL(p.valor_pago||0)}</span>
                                    <span style={{color:'rgba(232,234,237,.3)'}}> / {fmtBRL(p.valor)}</span>
                                  </span>
                                ) : fmtBRL(p.valor)}
                              </span>
                              {!p.pago && (
                                <>
                                  <button className="parc-pay-btn"
                                    style={{background:'rgba(0,212,170,.15)',color:'#00d4aa'}}
                                    disabled={pagando === p.id}
                                    onClick={() => pagarParcela(p.id)}>
                                    {pagando === p.id ? '...' : '✓ Pagar total'}
                                  </button>
                                  <button className="parc-pay-btn"
                                    style={{background:'rgba(255,211,42,.1)',color:'#ffd32a'}}
                                    disabled={pagando === p.id}
                                    onClick={() => abrirAbat(v)}>
                                    ◑ Abater
                                  </button>
                                </>
                              )}
                              {parcial && (
                                <div className="parc-progress">
                                  <div className="parc-track">
                                    <div className="parc-fill" style={{width:`${pct}%`}}/>
                                  </div>
                                  <span className="parc-abat-info">Restam {fmtBRL(p.saldo_restante||0)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        <div className="dp-foot">
          <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={onEdit}>
            Editar Cliente
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Clientes() {
  const [clientes,  setClientes]  = useState([]);
  const [alertas,   setAlertas]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filtro,    setFiltro]    = useState('todos');

  const [selected,  setSelected]  = useState(null);
  const [modal,     setModal]     = useState(null); // 'novo' | 'edit' | 'venda'
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, icon = '✓') => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, al] = await Promise.allSettled([
        api.get('/clientes'),
        api.get('/alertas/pagamentos'),
      ]);
      if (cl.status === 'fulfilled') setClientes(cl.value);
      if (al.status === 'fulfilled') setAlertas(al.value);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const vencidos = alertas.filter(a => a.status === 'vencido');
  const proximos = alertas.filter(a => a.status === 'proximo');

  const filtered = clientes.filter(c => {
    const m = !search || c.nome.toLowerCase().includes(search.toLowerCase())
      || (c.telefone||'').includes(search)
      || (c.cidade||'').toLowerCase().includes(search.toLowerCase());
    const f = filtro === 'todos' ? true
      : filtro === 'vencido'  ? c.alerta === 'vencido'
      : filtro === 'proximo'  ? c.alerta === 'proximo'
      : filtro === 'aberto'   ? c.total_em_aberto > 0
      : true;
    return m && f;
  });

  const stats = {
    total:   clientes.length,
    aberto:  clientes.filter(c => c.total_em_aberto > 0).length,
    vencido: clientes.filter(c => c.alerta === 'vencido').length,
    ok:      clientes.filter(c => !c.alerta && c.total_em_aberto === 0).length,
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/clientes/${id}`);
      setConfirmDel(null); setSelected(null);
      showToast('Cliente removido.', '🗑');
      load();
    } catch { showToast('Erro ao remover.', '✕'); }
  };

  return (
    <>
      <style>{S}</style>

      <div className="cl-page">

        {/* Alertas banner */}
        {vencidos.length > 0 && <AlertBanner items={vencidos} type="danger" />}
        {proximos.length > 0 && <AlertBanner items={proximos} type="warn" />}

        {/* Header */}
        <div className="cl-header">
          <div>
            <div className="cl-title">Clientes</div>
            <div className="cl-sub">{clientes.length} cliente(s) cadastrado(s)</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('novo')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Cliente
          </button>
        </div>

        {/* Stats */}
        <div className="cl-stats">
          {[
            { label:'Total',       val:stats.total,   color:'#0099ff' },
            { label:'Em aberto',   val:stats.aberto,  color:'#ffd32a' },
            { label:'Vencidos',    val:stats.vencido, color:'#ff4757' },
            { label:'Em dia',      val:stats.ok,      color:'#00d4aa' },
          ].map(s => (
            <div key={s.label} className="cl-stat">
              <div className="cs-dot" style={{ background:s.color }} />
              <div>
                <div className="cs-val">{s.val}</div>
                <div className="cs-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="cl-filters">
          <div className="cl-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color:'rgba(232,234,237,.28)',flexShrink:0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Buscar por nome, telefone ou cidade..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background:'none',border:'none',color:'rgba(232,234,237,.3)',cursor:'pointer',fontSize:16,lineHeight:1 }}>
                ×
              </button>
            )}
          </div>
          <select className="cl-sel" value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="aberto">Com saldo aberto</option>
            <option value="proximo">Vence em breve</option>
            <option value="vencido">Vencidos</option>
          </select>
        </div>

        {/* Grid */}
        <div className="cl-grid">
          {loading ? (
            Array.from({ length:6 }).map((_,i) => (
              <div key={i} className="cl-card" style={{ animationDelay:`${i*.05}s`,cursor:'default' }}>
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                  <div className="skel" style={{ height:38, width:38, borderRadius:'50%' }} />
                  <div className="skel" style={{ height:16, width:'70%' }} />
                  <div className="skel" style={{ height:12, width:'45%' }} />
                </div>
                <div style={{ padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[1,2,3].map(j => <div key={j} className="skel" style={{ height:32 }} />)}
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-icon">◯</div>
              <div style={{ fontSize:14 }}>Nenhum cliente encontrado</div>
              <div style={{ fontSize:12, fontFamily:'JetBrains Mono, monospace', marginTop:4 }}>
                {search ? 'Tente outro termo de busca' : 'Cadastre o primeiro cliente'}
              </div>
            </div>
          ) : filtered.map((c, i) => {
            const color = avatarColor(c.nome);
            const alertClass = c.alerta === 'vencido' ? 'alerta-danger'
                             : c.alerta === 'proximo'  ? 'alerta-warn' : '';
            return (
              <div
                key={c.id}
                className={`cl-card ${alertClass}${selected?.id === c.id ? ' selected' : ''}`}
                style={{ animationDelay:`${i*.04}s` }}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
              >
                {/* Alert strip */}
                <div className="cl-card-alert-strip" style={{
                  background: c.alerta === 'vencido' ? 'rgba(255,71,87,.6)'
                            : c.alerta === 'proximo' ? 'rgba(255,211,42,.5)' : 'transparent'
                }} />

                <div className="cl-card-top">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div className="cl-card-avatar" style={{ background:color }}>
                      {c.nome[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="cl-card-name">{c.nome}</div>
                      <div className="cl-card-tel">{fmtTel(c.telefone)}</div>
                      {c.endereco && <div className="cl-card-end">{c.endereco}{c.cidade ? `, ${c.cidade}` : ''}</div>}
                    </div>
                  </div>
                  <div className="cl-card-badges">
                    {c.alerta === 'vencido' && <span className="badge b-red">VENCIDO</span>}
                    {c.alerta === 'proximo' && <span className="badge b-yellow">VENCE EM BREVE</span>}
                    {c.total_em_aberto > 0  && <span className="badge b-blue">{fmtBRL(c.total_em_aberto)}</span>}
                  </div>
                </div>

                <div className="cl-card-mid">
                  <div>
                    <div className="cl-mini-lbl">Vendas</div>
                    <div className="cl-mini-val">{c.total_vendas}</div>
                  </div>
                  <div>
                    <div className="cl-mini-lbl">Em aberto</div>
                    <div className={`cl-mini-val ${c.total_em_aberto > 0 ? c.alerta === 'vencido' ? 'red' : 'yellow' : 'green'}`}>
                      {c.total_em_aberto > 0 ? fmtBRL(c.total_em_aberto) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="cl-mini-lbl">Venc. parc.</div>
                    <div className={`cl-mini-val ${c.parcelas_vencidas > 0 ? 'red' : c.parcelas_proximas > 0 ? 'yellow' : 'green'}`}>
                      {c.parcelas_vencidas > 0 ? c.parcelas_vencidas
                       : c.parcelas_proximas > 0 ? c.parcelas_proximas : '—'}
                    </div>
                  </div>
                </div>

                <div className="cl-card-bot" onClick={e => e.stopPropagation()}>
                  <div className="cl-vendedor">
                    {c.vendedor ? `Vendedor: ${c.vendedor}` : `Desde ${c.criado_em}`}
                  </div>
                  <div className="cl-actions">
                    <button className="icon-btn" title="Editar"
                      onClick={e => { e.stopPropagation(); setSelected(c); setModal('edit'); }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                      </svg>
                    </button>
                    <button className="icon-btn danger" title="Remover"
                      onClick={e => { e.stopPropagation(); setConfirmDel(c); }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && modal !== 'edit' && modal !== 'venda' && modal !== 'novo' && (
        <DetalheCliente
          cliente={selected}
          onClose={() => setSelected(null)}
          onEdit={() => setModal('edit')}
          onNovaVenda={() => setModal('venda')}
          onParcelaPaga={() => { load(); }}
        />
      )}

      {/* Modal novo cliente */}
      {modal === 'novo' && (
        <ModalCliente
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* Modal editar cliente */}
      {modal === 'edit' && selected && (
        <ModalCliente
          inicial={selected}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* Modal nova venda */}
      {modal === 'venda' && selected && (
        <ModalVenda
          clienteId={selected.id}
          clienteNome={selected.nome}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showToast={showToast}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="confirm">
            <div className="confirm-title">Remover cliente?</div>
            <div className="confirm-text">
              Tem certeza que deseja remover <strong style={{ color:'#e8eaed' }}>{confirmDel.nome}</strong>?
              O histórico de vendas será preservado.
            </div>
            <div className="confirm-acts">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDel.id)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <span style={{ fontSize:16 }}>{toast.icon}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}