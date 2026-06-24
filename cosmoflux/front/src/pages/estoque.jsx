import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/* =========================================================================
   Estoque.jsx — Tela unificada de Estoque (CosmoFlux / design system "cf")
   Funde Estoque + Entradas + Saídas em uma única tela.

   Endpoints usados (já existentes no backend, NÃO são novos):
     GET  /produtos
     GET  /movimentacoes?tipo=entrada|saida&limite=100
     POST /movimentacoes  { produto_id, tipo, quantidade, motivo, observacao, preco_custo_real }

   Se as requisições falharem (ex.: preview sem backend), a tela cai
   automaticamente em DADOS DE DEMONSTRAÇÃO — basta apontar API_BASE pro
   seu backend e remover/ignorar o fallback.
   ========================================================================= */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';
const tok = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const api = {
  get:  (url)    => fetch(API_BASE+url, { headers: authHeaders() }).then(async r => { if(!r.ok) throw new Error('Erro ao carregar'); return r.json(); }),
  post: (url, b) => fetch(API_BASE+url, { method:'POST', headers: authHeaders(), body: JSON.stringify(b) }).then(async r => { const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.detail||'Erro ao salvar'); return d; }),
};

const ENTRADA_MOTIVOS = [
  "Compra de fornecedor",
  "Devolução de cliente",
  "Ajuste de inventário",
  "Brinde/Amostra",
  "Transferência",
  "Outros",
];
const SAIDA_MOTIVOS = [
  "Venda direta",
  "Uso interno",
  "Perda/Vencimento",
  "Brinde",
  "Devolução a fornecedor",
  "Ajuste de inventário",
  "Outros",
];

/* ---------- helpers de leitura defensiva (nomes de campo variados) ------- */
const asArr = (x) => (Array.isArray(x) ? x : x && (x.items || x.data || x.results) || []);
const pid = (p) => p.id ?? p.produto_id ?? p._id;
const pnome = (p) => p.nome ?? p.name ?? p.produto ?? "Produto";
const pestoque = (p) => Number(p.estoque ?? p.estoque_atual ?? p.quantidade ?? p.qtd ?? 0);
const pmin = (p) => Number(p.estoque_minimo ?? p.minimo ?? p.estoque_min ?? p.min ?? 0);
const pcusto = (p) => Number(p.preco_custo ?? p.custo ?? p.preco ?? p.preco_venda ?? 0);
const statusOf = (p) => {
  const e = pestoque(p);
  if (e <= 0) return "esgotado";
  if (e <= pmin(p)) return "critico";
  return "ok";
};
const mtipo = (m) => m.tipo ?? "entrada";
const mqtd = (m) => Number(m.quantidade ?? m.qtd ?? 0);
const mmotivo = (m) => m.motivo ?? "—";
// para ordenar: usa o ISO bruto; para exibir: usa a string já formatada do backend
const mdataRaw = (m) => m.data_raw ?? m.criado_em ?? m.created_at ?? "";
const mdataFmt = (m) => m.data ?? "—";
const mpid = (m) => m.produto_id ?? m.produtoId ?? m.produto?.id;
const mproduto = (m) => m.produto ?? m.produto_nome ?? "";

/* ---------- formatadores ------------------------------------------------- */
const fmtBRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = (n) => (Number(n) || 0).toLocaleString("pt-BR");
const fmtData = (s) => {
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
};

/* ====================== DADOS DE DEMONSTRAÇÃO ============================ */
const _ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();

/* ============================ ÍCONES (inline) =========================== */
const Icon = {
  search: <path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />,
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />,
  alert: <path d="M12 2 1 21h22L12 2Zm0 4.3L19.5 19h-15L12 6.3ZM11 10v5h2v-5h-2Zm0 6v2h2v-2h-2Z" />,
  chevron: <path d="M7 10l5 5 5-5H7Z" />,
  close: <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z" />,
  box: <path d="M3 7 12 2l9 5v10l-9 5-9-5V7Zm9-2.8L5.5 7.5 12 11l6.5-3.5L12 4.2ZM5 9.2v6.6l6 3.3v-6.6L5 9.2Zm14 0-6 3.3v6.6l6-3.3V9.2Z" />,
};
const Svg = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{d}</svg>
);

/* ============================ PILL DE STATUS ============================ */
const STATUS_META = {
  ok: { label: "OK", cls: "ok" },
  critico: { label: "CRÍTICO", cls: "warn" },
  esgotado: { label: "ESGOTADO", cls: "crit" },
};
function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.ok;
  return <span className={"cfx-pill cfx-pill--" + m.cls}>{m.label}</span>;
}

/* ============================ KPI CARD ================================== */
function Kpi({ label, value, accent, sub }) {
  return (
    <div className={"cfx-kpi cfx-kpi--" + accent}>
      <div className="cfx-kpi-bar" />
      <div className="cfx-kpi-body">
        <span className="cfx-kpi-label">{label}</span>
        <span className="cfx-kpi-value">{value}</span>
        {sub && <span className="cfx-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

/* ============================ MODAL (portal) =========================== */
function Modal({ open, onClose, title, accent, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="cfx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"cfx-modal cfx-modal--" + accent} role="dialog" aria-modal="true" aria-label={title}>
        <header className="cfx-modal-head">
          <h3 className="cfx-modal-title">{title}</h3>
          <button className="cfx-iconbtn" onClick={onClose} aria-label="Fechar"><Svg d={Icon.close} size={16} /></button>
        </header>
        <div className="cfx-modal-body">{children}</div>
        {footer && <footer className="cfx-modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ===================== SELETOR DE PRODUTO (busca) ===================== */
function ProductSelect({ produtos, value, onChange, tipo }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const sel = produtos.find((p) => pid(p) === value);
  const filt = useMemo(() => {
    const t = q.trim().toLowerCase();
    return produtos.filter((p) => !t || pnome(p).toLowerCase().includes(t)).slice(0, 8);
  }, [produtos, q]);
  useEffect(() => {
    const h = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="cfx-ps" ref={wrapRef}>
      <button type="button" className="cfx-field cfx-ps-trigger" onClick={() => setOpen((o) => !o)}>
        {sel ? (
          <span className="cfx-ps-sel">
            <span className="cfx-ps-name">{pnome(sel)}</span>
            <span className="cfx-ps-stock cfx-mono">{pestoque(sel)} un</span>
          </span>
        ) : (
          <span className="cfx-ps-ph">Selecione um produto…</span>
        )}
        <Svg d={Icon.chevron} size={16} />
      </button>
      {open && (
        <div className="cfx-ps-pop">
          <div className="cfx-ps-search">
            <Svg d={Icon.search} size={15} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" />
          </div>
          <div className="cfx-ps-list">
            {filt.length === 0 && <div className="cfx-ps-empty">Nenhum produto.</div>}
            {filt.map((p) => {
              const st = statusOf(p);
              return (
                <button
                  type="button"
                  key={pid(p)}
                  className={"cfx-ps-opt" + (pid(p) === value ? " is-sel" : "")}
                  onClick={() => { onChange(pid(p)); setOpen(false); setQ(""); }}
                >
                  <span className="cfx-ps-name">{pnome(p)}</span>
                  <span className={"cfx-dot cfx-dot--" + (st === "ok" ? "ok" : st === "critico" ? "warn" : "crit")} />
                  <span className="cfx-ps-stock cfx-mono">{pestoque(p)} un</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== FORM ENTRADA / SAÍDA ========================== */
function MovForm({ tipo, produtos, onSubmit, onCancel }) {
  const motivos = tipo === "entrada" ? ENTRADA_MOTIVOS : SAIDA_MOTIVOS;
  const [produtoId, setProdutoId] = useState(null);
  const [qtd, setQtd] = useState("");
  const [motivo, setMotivo] = useState(motivos[0]);
  const [custo, setCusto] = useState("");
  const [obs, setObs] = useState("");
  const [err, setErr] = useState("");

  const prod = produtos.find((p) => pid(p) === produtoId);
  const estoqueAtual = prod ? pestoque(prod) : 0;
  const qNum = Number(qtd);
  const excedeSaida = tipo === "saida" && prod && qNum > estoqueAtual;
  const valido = produtoId != null && qNum > 0 && !excedeSaida;

  const submit = () => {
    if (!produtoId) return setErr("Selecione um produto.");
    if (!(qNum > 0)) return setErr("Informe uma quantidade válida.");
    if (excedeSaida) return setErr(`Saída maior que o estoque disponível (${estoqueAtual} un).`);
    onSubmit({
      produto_id: produtoId,
      tipo,
      quantidade: qNum,
      motivo,
      observacao: obs.trim(),
      ...(tipo === "entrada" && custo ? { preco_custo_real: Number(custo) } : {}),
    });
  };

  return (
    <>
      <div className="cfx-form">
        <label className="cfx-lab">
          <span>Produto</span>
          <ProductSelect produtos={produtos} value={produtoId} onChange={(v) => { setProdutoId(v); setErr(""); }} tipo={tipo} />
        </label>

        <div className="cfx-form-row">
          <label className="cfx-lab">
            <span>Quantidade</span>
            <input
              className={"cfx-field cfx-mono" + (excedeSaida ? " is-err" : "")}
              type="number" min="1" inputMode="numeric" value={qtd}
              onChange={(e) => { setQtd(e.target.value); setErr(""); }} placeholder="0"
            />
            {prod && (
              <span className="cfx-hint">
                Estoque atual: <b className="cfx-mono">{estoqueAtual}</b>
                {tipo === "saida" && qNum > 0 && !excedeSaida && (
                  <> → ficará <b className="cfx-mono">{estoqueAtual - qNum}</b></>
                )}
                {tipo === "entrada" && qNum > 0 && (
                  <> → ficará <b className="cfx-mono">{estoqueAtual + qNum}</b></>
                )}
              </span>
            )}
          </label>
          <label className="cfx-lab">
            <span>Motivo</span>
            <div className="cfx-selwrap">
              <select className="cfx-field" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {motivos.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Svg d={Icon.chevron} size={16} />
            </div>
          </label>
        </div>

        {tipo === "entrada" && (
          <label className="cfx-lab">
            <span>Preço de custo real <em>(opcional)</em></span>
            <input className="cfx-field cfx-mono" type="number" min="0" step="0.01" value={custo}
              onChange={(e) => setCusto(e.target.value)} placeholder="R$ 0,00" />
          </label>
        )}

        <label className="cfx-lab">
          <span>Observação <em>(opcional)</em></span>
          <textarea className="cfx-field" rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Anotações sobre esta movimentação…" />
        </label>

        {err && <div className="cfx-err">{err}</div>}
      </div>

      <div className="cfx-modal-actions">
        <button className="cfx-btn cfx-btn--ghost" onClick={onCancel}>Cancelar</button>
        <button className={"cfx-btn cfx-btn--" + (tipo === "entrada" ? "ok" : "crit")} disabled={!valido} onClick={submit}>
          {tipo === "entrada" ? "Registrar entrada" : "Registrar saída"}
        </button>
      </div>
    </>
  );
}

/* ============================ COMPONENTE PRINCIPAL ==================== */
export default function Estoque() {
  const [theme, setTheme] = useState(
    () => (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "dark"
  );
  const [produtos, setProdutos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [tab, setTab] = useState("estoque");
  const [busca, setBusca] = useState("");
  const [alertasOpen, setAlertasOpen] = useState(true);
  const [movFiltro, setMovFiltro] = useState("todas");
  const [modal, setModal] = useState(null); // 'entrada' | 'saida' | null
  const [toast, setToast] = useState(null);

  /* tema global do app */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(el.getAttribute("data-theme") || "dark"));
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErroCarga("");
    try {
      const [p, m] = await Promise.all([
        api.get("/produtos"),
        api.get("/movimentacoes?limite=100"),
      ]);
      setProdutos(asArr(p));
      setMovs(asArr(m));
    } catch (e) {
      setErroCarga(e.message || "Não foi possível carregar os dados.");
      setProdutos([]); setMovs([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const showToast = (msg, kind) => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2600);
  };

  /* registrar movimentação: POST real + recarrega dados do servidor */
  const registrar = async (payload) => {
    const isEnt = payload.tipo === "entrada";
    try {
      await api.post("/movimentacoes", payload);
      setModal(null);
      showToast(
        `${isEnt ? "Entrada" : "Saída"} de ${payload.quantidade} un registrada.`,
        isEnt ? "ok" : "crit"
      );
      await load(); // recarrega estoque e histórico reais
    } catch (e) {
      showToast(e.message || "Erro ao registrar movimentação.", "crit");
    }
  };

  /* ---------------- derivados ---------------- */
  const valorTotal = useMemo(
    () => produtos.reduce((s, p) => s + pestoque(p) * pcusto(p), 0),
    [produtos]
  );
  const nCritico = useMemo(() => produtos.filter((p) => statusOf(p) === "critico").length, [produtos]);
  const nEsgotado = useMemo(() => produtos.filter((p) => statusOf(p) === "esgotado").length, [produtos]);
  const alertas = useMemo(
    () => produtos.filter((p) => statusOf(p) !== "ok").sort((a, b) => pestoque(a) - pestoque(b)),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const arr = produtos.filter((p) => !t || pnome(p).toLowerCase().includes(t));
    const rank = { esgotado: 0, critico: 1, ok: 2 };
    return arr.slice().sort((a, b) => rank[statusOf(a)] - rank[statusOf(b)] || pnome(a).localeCompare(pnome(b)));
  }, [produtos, busca]);

  const prodById = useMemo(() => {
    const m = {};
    produtos.forEach((p) => { m[pid(p)] = p; });
    return m;
  }, [produtos]);

  const movsFiltradas = useMemo(() => {
    let arr = movs.slice();
    if (movFiltro === "entradas") arr = arr.filter((m) => mtipo(m) === "entrada");
    if (movFiltro === "saidas") arr = arr.filter((m) => mtipo(m) === "saida");
    return arr.sort((a, b) => new Date(mdataRaw(b)) - new Date(mdataRaw(a)));
  }, [movs, movFiltro]);

  const movKpis = useMemo(() => {
    const unidades = movsFiltradas.reduce((s, m) => s + mqtd(m), 0);
    const valor = movsFiltradas.reduce((s, m) => {
      const p = prodById[mpid(m)];
      const custo = m.preco_custo_real ?? (p ? pcusto(p) : 0);
      return s + mqtd(m) * custo;
    }, 0);
    return { registros: movsFiltradas.length, unidades, valor };
  }, [movsFiltradas, prodById]);

  /* ============================ RENDER ============================ */
  return (
    <div className="cfx" data-cf-theme={theme}>
      <style>{STYLE}</style>

      {/* ---------------- HEADER ---------------- */}
      <header className="cfx-head">
        <div className="cfx-head-l">
          <div className="cfx-head-titlewrap">
            <span className="cfx-head-icon"><Svg d={Icon.box} size={20} /></span>
            <div>
              <h1 className="cfx-h1">Estoque</h1>
              <p className="cfx-sub">Produtos, alertas e movimentações em um só lugar</p>
            </div>
          </div>
          {erroCarga && <span className="cfx-demo" style={{color:'var(--crit)',borderColor:'var(--crit)'}}>{erroCarga}</span>}
        </div>
        <div className="cfx-head-actions">
          <button className="cfx-btn cfx-btn--ok" onClick={() => setModal("entrada")}>
            <Svg d={Icon.plus} size={16} /> Registrar entrada
          </button>
          <button className="cfx-btn cfx-btn--crit" onClick={() => setModal("saida")}>
            <Svg d={Icon.plus} size={16} /> Registrar saída
          </button>
        </div>
      </header>

      {/* ---------------- TABS ---------------- */}
      <nav className="cfx-tabs">
        <button className={"cfx-tab" + (tab === "estoque" ? " is-active" : "")} onClick={() => setTab("estoque")}>
          Estoque
        </button>
        <button className={"cfx-tab" + (tab === "mov" ? " is-active" : "")} onClick={() => setTab("mov")}>
          Movimentações
          <span className="cfx-tab-count cfx-mono">{movs.length}</span>
        </button>
      </nav>

      {/* ======================= ABA ESTOQUE ======================= */}
      {tab === "estoque" && (
        <div className="cfx-panel">
          <div className="cfx-kpis">
            <Kpi accent="brand" label="Total de produtos" value={fmtInt(produtos.length)} sub="cadastrados" />
            <Kpi accent="ok" label="Valor em estoque" value={fmtBRL(valorTotal)} sub="a preço de custo" />
            <Kpi accent="warn" label="Em estado crítico" value={fmtInt(nCritico)} sub="estoque ≤ mínimo" />
            <Kpi accent="crit" label="Esgotados" value={fmtInt(nEsgotado)} sub="estoque zerado" />
          </div>

          {/* alertas */}
          {alertas.length > 0 && (
            <section className={"cfx-alert" + (alertasOpen ? " is-open" : "")}>
              <button className="cfx-alert-head" onClick={() => setAlertasOpen((o) => !o)}>
                <span className="cfx-alert-icon"><Svg d={Icon.alert} size={16} /></span>
                <span className="cfx-alert-title">
                  {alertas.length} {alertas.length === 1 ? "produto precisa" : "produtos precisam"} de atenção
                </span>
                <span className="cfx-alert-spacer" />
                <span className={"cfx-chev" + (alertasOpen ? " is-up" : "")}><Svg d={Icon.chevron} size={18} /></span>
              </button>
              {alertasOpen && (
                <div className="cfx-alert-body">
                  {alertas.map((p) => {
                    const st = statusOf(p);
                    return (
                      <div className="cfx-alert-item" key={pid(p)}>
                        <span className={"cfx-dot cfx-dot--" + (st === "critico" ? "warn" : "crit")} />
                        <span className="cfx-alert-name">{pnome(p)}</span>
                        <span className="cfx-alert-meta cfx-mono">
                          {pestoque(p)} / mín. {pmin(p)}
                        </span>
                        <StatusPill status={st} />
                        <button className="cfx-link cfx-link--ok" onClick={() => setModal("entrada")}>Repor</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* busca */}
          <div className="cfx-toolbar">
            <div className="cfx-search">
              <Svg d={Icon.search} size={16} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto…" />
            </div>
            <span className="cfx-toolbar-count cfx-mono">{produtosFiltrados.length} itens</span>
          </div>

          {/* tabela / grid */}
          <div className="cfx-table" role="table">
            <div className="cfx-tr cfx-tr--head" role="row">
              <span role="columnheader">Produto</span>
              <span role="columnheader" className="cfx-num">Atual</span>
              <span role="columnheader" className="cfx-num">Mínimo</span>
              <span role="columnheader">Status</span>
              <span role="columnheader" className="cfx-num">Valor</span>
            </div>
            {loading && <div className="cfx-empty">Carregando…</div>}
            {!loading && produtosFiltrados.length === 0 && <div className="cfx-empty">Nenhum produto encontrado.</div>}
            {produtosFiltrados.map((p) => {
              const st = statusOf(p);
              return (
                <div className={"cfx-tr cfx-tr--" + st} role="row" key={pid(p)}>
                  <span className="cfx-td-name" role="cell">
                    <span className={"cfx-stripe cfx-stripe--" + (st === "ok" ? "ok" : st === "critico" ? "warn" : "crit")} />
                    {pnome(p)}
                  </span>
                  <span className="cfx-num cfx-mono" role="cell"><i className="cfx-cl">Atual</i>{pestoque(p)}</span>
                  <span className="cfx-num cfx-mono cfx-dim" role="cell"><i className="cfx-cl">Mínimo</i>{pmin(p)}</span>
                  <span role="cell"><i className="cfx-cl">Status</i><StatusPill status={st} /></span>
                  <span className="cfx-num cfx-mono" role="cell"><i className="cfx-cl">Valor</i>{fmtBRL(pestoque(p) * pcusto(p))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== ABA MOVIMENTAÇÕES ===================== */}
      {tab === "mov" && (
        <div className="cfx-panel">
          <div className="cfx-kpis cfx-kpis--3">
            <Kpi accent="brand" label="Registros" value={fmtInt(movKpis.registros)} sub={movFiltro === "todas" ? "todas as movimentações" : movFiltro} />
            <Kpi accent="ok" label="Unidades movimentadas" value={fmtInt(movKpis.unidades)} sub="soma das quantidades" />
            <Kpi accent="warn" label="Valor movimentado" value={fmtBRL(movKpis.valor)} sub="a preço de custo" />
          </div>

          <div className="cfx-chips">
            {[
              { k: "todas", l: "Todas" },
              { k: "entradas", l: "Entradas" },
              { k: "saidas", l: "Saídas" },
            ].map((c) => (
              <button key={c.k} className={"cfx-chip cfx-chip--" + c.k + (movFiltro === c.k ? " is-active" : "")}
                onClick={() => setMovFiltro(c.k)}>{c.l}</button>
            ))}
          </div>

          <div className="cfx-table cfx-table--mov" role="table">
            <div className="cfx-tr cfx-mvr cfx-tr--head" role="row">
              <span role="columnheader">Produto</span>
              <span role="columnheader">Tipo</span>
              <span role="columnheader" className="cfx-num">Qtd</span>
              <span role="columnheader">Motivo</span>
              <span role="columnheader" className="cfx-num">Data</span>
            </div>
            {movsFiltradas.length === 0 && <div className="cfx-empty">Nenhuma movimentação.</div>}
            {movsFiltradas.map((m) => {
              const ent = mtipo(m) === "entrada";
              const p = prodById[mpid(m)];
              return (
                <div className="cfx-tr cfx-mvr" role="row" key={m.id}>
                  <span className="cfx-td-name" role="cell">{mproduto(m) || (p ? pnome(p) : "Produto #" + mpid(m))}</span>
                  <span role="cell">
                    <i className="cfx-cl">Tipo</i>
                    <span className={"cfx-tipo cfx-tipo--" + (ent ? "ok" : "crit")}>
                      <span className="cfx-tipo-arr">{ent ? "↓" : "↑"}</span>
                      {ent ? "Entrada" : "Saída"}
                    </span>
                  </span>
                  <span className="cfx-num cfx-mono" role="cell">
                    <i className="cfx-cl">Qtd</i>
                    <b className={ent ? "cfx-pos" : "cfx-neg"}>{ent ? "+" : "−"}{mqtd(m)}</b>
                  </span>
                  <span className="cfx-dim" role="cell"><i className="cfx-cl">Motivo</i>{mmotivo(m)}</span>
                  <span className="cfx-num cfx-mono cfx-dim" role="cell"><i className="cfx-cl">Data</i>{mdataFmt(m)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- MODAIS ---------------- */}
      <Modal open={modal === "entrada"} onClose={() => setModal(null)} title="Registrar entrada" accent="ok">
        <MovForm tipo="entrada" produtos={produtos} onSubmit={registrar} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "saida"} onClose={() => setModal(null)} title="Registrar saída" accent="crit">
        <MovForm tipo="saida" produtos={produtos} onSubmit={registrar} onCancel={() => setModal(null)} />
      </Modal>

      {/* ---------------- TOAST ---------------- */}
      {toast && <div className={"cfx-toast cfx-toast--" + toast.kind}>{toast.msg}</div>}
    </div>
  );
}

/* ============================ ESTILOS (cf) ========================== */
const STYLE = `
.cfx{
  --brand:#9166d8; --ok:#21a06d; --warn:#e08a2a; --crit:#e2514f;
  --bg:#faf9fc; --surface:#ffffff; --surface-2:#f4f2f9;
  --border:#e8e5f0; --text:#1b1726; --text-dim:#5b5570; --text-muted:#938da6;
  --shadow:0 1px 2px rgba(24,16,48,.05), 0 6px 18px rgba(24,16,48,.05);
  --shadow-lg:0 18px 60px rgba(20,10,45,.28);
  --r:15px;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;
  color:var(--text); background:var(--bg);
  min-height:100%; box-sizing:border-box; padding:22px clamp(14px,3vw,30px) 60px;
  -webkit-font-smoothing:antialiased;
}
.cfx[data-cf-theme="dark"]{
  --bg:#100e16; --surface:#1b1825; --surface-2:#15131f;
  --border:#2c2839; --text:#f1eff7; --text-dim:#b0aac2; --text-muted:#7a758c;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 8px 22px rgba(0,0,0,.32);
  --shadow-lg:0 22px 70px rgba(0,0,0,.6);
}
.cfx *{box-sizing:border-box}
.cfx-mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-feature-settings:"tnum"}
.cfx-dim{color:var(--text-dim)}

/* header */
.cfx-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:18px}
.cfx-head-l{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.cfx-head-titlewrap{display:flex;align-items:center;gap:13px}
.cfx-head-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;
  background:color-mix(in srgb,var(--brand) 14%,var(--surface));color:var(--brand);flex:none}
.cfx-h1{margin:0;font-size:23px;font-weight:800;letter-spacing:-.02em}
.cfx-sub{margin:2px 0 0;font-size:13px;color:var(--text-muted)}
.cfx-demo{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;
  color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,var(--surface));
  border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);padding:4px 9px;border-radius:7px}
.cfx-head-actions{display:flex;gap:10px;flex-wrap:wrap}

/* botões */
.cfx-btn{display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13.5px;font-weight:700;
  border-radius:11px;padding:10px 15px;border:1px solid transparent;cursor:pointer;transition:.15s;white-space:nowrap}
.cfx-btn:disabled{opacity:.45;cursor:not-allowed}
.cfx-btn--ok{background:var(--ok);color:#fff;box-shadow:0 2px 8px color-mix(in srgb,var(--ok) 40%,transparent)}
.cfx-btn--ok:not(:disabled):hover{filter:brightness(1.06);transform:translateY(-1px)}
.cfx-btn--crit{background:var(--crit);color:#fff;box-shadow:0 2px 8px color-mix(in srgb,var(--crit) 40%,transparent)}
.cfx-btn--crit:not(:disabled):hover{filter:brightness(1.06);transform:translateY(-1px)}
.cfx-btn--ghost{background:var(--surface-2);color:var(--text-dim);border-color:var(--border)}
.cfx-btn--ghost:hover{color:var(--text)}
.cfx-iconbtn{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;border:1px solid var(--border);
  background:var(--surface-2);color:var(--text-dim);cursor:pointer;transition:.15s}
.cfx-iconbtn:hover{color:var(--text)}

/* tabs */
.cfx-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px}
.cfx-tab{position:relative;background:none;border:none;font-family:inherit;font-size:14.5px;font-weight:700;
  color:var(--text-muted);padding:11px 4px;margin-right:22px;cursor:pointer;display:flex;align-items:center;gap:8px;
  transition:.15s;border-bottom:2px solid transparent;margin-bottom:-1px}
.cfx-tab:hover{color:var(--text-dim)}
.cfx-tab.is-active{color:var(--text);border-bottom-color:var(--brand)}
.cfx-tab-count{font-size:11px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-muted);
  padding:1px 7px;border-radius:20px}

/* kpis */
.cfx-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:18px}
.cfx-kpis--3{grid-template-columns:repeat(3,1fr)}
.cfx-kpi{position:relative;display:flex;gap:0;background:var(--surface);border:1px solid var(--border);
  border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow)}
.cfx-kpi-bar{width:4px;flex:none}
.cfx-kpi--brand .cfx-kpi-bar{background:var(--brand)} .cfx-kpi--ok .cfx-kpi-bar{background:var(--ok)}
.cfx-kpi--warn .cfx-kpi-bar{background:var(--warn)} .cfx-kpi--crit .cfx-kpi-bar{background:var(--crit)}
.cfx-kpi-body{padding:14px 16px;display:flex;flex-direction:column;gap:3px;min-width:0}
.cfx-kpi-label{font-size:12px;font-weight:600;color:var(--text-muted)}
.cfx-kpi-value{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.cfx-kpi-sub{font-size:11px;color:var(--text-muted)}

/* alertas */
.cfx-alert{background:color-mix(in srgb,var(--crit) 7%,var(--surface));border:1px solid color-mix(in srgb,var(--crit) 26%,var(--border));
  border-radius:var(--r);margin-bottom:18px;overflow:hidden}
.cfx-alert-head{width:100%;display:flex;align-items:center;gap:11px;padding:13px 16px;background:none;border:none;
  cursor:pointer;font-family:inherit;color:var(--text);text-align:left}
.cfx-alert-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;flex:none;
  background:color-mix(in srgb,var(--crit) 18%,var(--surface));color:var(--crit)}
.cfx-alert-title{font-size:14px;font-weight:700}
.cfx-alert-spacer{flex:1}
.cfx-chev{color:var(--text-muted);transition:transform .2s}.cfx-chev.is-up{transform:rotate(180deg)}
.cfx-alert-body{padding:2px 12px 12px}
.cfx-alert-item{display:flex;align-items:center;gap:11px;padding:9px 8px;border-top:1px solid color-mix(in srgb,var(--crit) 14%,var(--border))}
.cfx-alert-name{font-size:13.5px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cfx-alert-meta{font-size:12px;color:var(--text-dim)}
.cfx-link{background:none;border:none;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;padding:4px 6px;border-radius:7px}
.cfx-link--ok{color:var(--ok)}.cfx-link--ok:hover{background:color-mix(in srgb,var(--ok) 14%,transparent)}
.cfx-dot{width:9px;height:9px;border-radius:50%;flex:none}
.cfx-dot--ok{background:var(--ok)}.cfx-dot--warn{background:var(--warn)}.cfx-dot--crit{background:var(--crit)}

/* toolbar / busca */
.cfx-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.cfx-search{flex:1;max-width:420px;display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--border);
  border-radius:11px;padding:0 13px;color:var(--text-muted);transition:.15s}
.cfx-search:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent)}
.cfx-search input{flex:1;border:none;background:none;outline:none;font-family:inherit;font-size:14px;color:var(--text);padding:11px 0}
.cfx-toolbar-count{font-size:12px;color:var(--text-muted)}

/* tabela */
.cfx-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow)}
.cfx-tr{display:grid;grid-template-columns:1fr 90px 90px 130px 130px;align-items:center;gap:12px;padding:13px 16px;
  border-top:1px solid var(--border)}
.cfx-table--mov .cfx-tr,.cfx-mvr{grid-template-columns:1.4fr 130px 90px 1fr 120px}
.cfx-tr--head{border-top:none;background:var(--surface-2);font-size:11px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--text-muted)}
.cfx-tr:not(.cfx-tr--head):hover{background:color-mix(in srgb,var(--brand) 4%,var(--surface))}
.cfx-num{text-align:right;justify-self:end}
.cfx-tr--head .cfx-num{justify-self:end}
.cfx-td-name{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;min-width:0;
  overflow:hidden;text-overflow:ellipsis}
.cfx-stripe{width:3px;height:18px;border-radius:3px;flex:none}
.cfx-stripe--ok{background:var(--ok)}.cfx-stripe--warn{background:var(--warn)}.cfx-stripe--crit{background:var(--crit)}
.cfx-cl{display:none}
.cfx-empty{padding:30px 16px;text-align:center;color:var(--text-muted);font-size:13.5px;border-top:1px solid var(--border)}

/* pills */
.cfx-pill{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:.05em;
  padding:4px 9px;border-radius:20px;border:1px solid transparent}
.cfx-pill--ok{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent);border-color:color-mix(in srgb,var(--ok) 30%,transparent)}
.cfx-pill--warn{color:var(--warn);background:color-mix(in srgb,var(--warn) 13%,transparent);border-color:color-mix(in srgb,var(--warn) 32%,transparent)}
.cfx-pill--crit{color:var(--crit);background:color-mix(in srgb,var(--crit) 13%,transparent);border-color:color-mix(in srgb,var(--crit) 32%,transparent)}

/* chips */
.cfx-chips{display:flex;gap:8px;margin-bottom:14px}
.cfx-chip{font-family:inherit;font-size:13px;font-weight:700;padding:8px 16px;border-radius:20px;cursor:pointer;
  background:var(--surface);border:1px solid var(--border);color:var(--text-dim);transition:.15s}
.cfx-chip:hover{color:var(--text)}
.cfx-chip.is-active.cfx-chip--todas{background:var(--brand);border-color:var(--brand);color:#fff}
.cfx-chip.is-active.cfx-chip--entradas{background:var(--ok);border-color:var(--ok);color:#fff}
.cfx-chip.is-active.cfx-chip--saidas{background:var(--crit);border-color:var(--crit);color:#fff}

/* tipo de movimentação */
.cfx-tipo{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:4px 10px;border-radius:8px}
.cfx-tipo--ok{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
.cfx-tipo--crit{color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent)}
.cfx-tipo-arr{font-size:14px;line-height:1}
.cfx-pos{color:var(--ok)}.cfx-neg{color:var(--crit)}

/* overlay + modal */
.cfx-overlay{position:fixed;inset:0;z-index:9999;background:rgba(18,12,32,.55);backdrop-filter:blur(3px);
  display:flex;align-items:center;justify-content:center;padding:20px;animation:cfx-fade .15s ease}
@keyframes cfx-fade{from{opacity:0}to{opacity:1}}
@keyframes cfx-pop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.cfx-modal{width:100%;max-width:460px;background:var(--surface);border:1px solid var(--border);border-radius:18px;
  box-shadow:var(--shadow-lg);overflow:hidden;animation:cfx-pop .18s cubic-bezier(.2,.8,.2,1);
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--text);max-height:90vh;display:flex;flex-direction:column}
.cfx-modal--ok{border-top:3px solid var(--ok)}.cfx-modal--crit{border-top:3px solid var(--crit)}
.cfx-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px}
.cfx-modal-title{margin:0;font-size:18px;font-weight:800;letter-spacing:-.01em}
.cfx-modal-body{padding:0 20px;overflow:auto}
.cfx-modal-foot{padding:14px 20px}
.cfx-modal-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 20px 20px}
.cfx-modal-actions .cfx-btn{flex:1;justify-content:center;padding:12px}

/* form */
.cfx-form{display:flex;flex-direction:column;gap:15px;padding-bottom:4px}
.cfx-form-row{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.cfx-lab{display:flex;flex-direction:column;gap:7px;font-size:12.5px;font-weight:700;color:var(--text-dim)}
.cfx-lab em{font-weight:500;color:var(--text-muted);font-style:normal}
.cfx-field{width:100%;font-family:inherit;font-size:14px;color:var(--text);background:var(--surface-2);
  border:1px solid var(--border);border-radius:10px;padding:11px 13px;outline:none;transition:.15s}
.cfx-field:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent);background:var(--surface)}
.cfx-field.is-err{border-color:var(--crit);box-shadow:0 0 0 3px color-mix(in srgb,var(--crit) 18%,transparent)}
textarea.cfx-field{resize:vertical;min-height:54px}
.cfx-selwrap{position:relative;display:flex}
.cfx-selwrap select{appearance:none;padding-right:34px}
.cfx-selwrap svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none}
.cfx-hint{font-size:11.5px;font-weight:500;color:var(--text-muted)}
.cfx-hint b{color:var(--text-dim)}
.cfx-err{font-size:12.5px;font-weight:600;color:var(--crit);background:color-mix(in srgb,var(--crit) 10%,transparent);
  border:1px solid color-mix(in srgb,var(--crit) 26%,transparent);padding:9px 12px;border-radius:9px}

/* product select */
.cfx-ps{position:relative}
.cfx-ps-trigger{display:flex;align-items:center;justify-content:space-between;cursor:pointer;text-align:left;color:var(--text)}
.cfx-ps-trigger svg{color:var(--text-muted);flex:none}
.cfx-ps-sel{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.cfx-ps-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cfx-ps-stock{font-size:11.5px;color:var(--text-muted);flex:none}
.cfx-ps-ph{color:var(--text-muted);font-weight:500}
.cfx-ps-pop{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:10;background:var(--surface);
  border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);overflow:hidden}
.cfx-ps-search{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border);color:var(--text-muted)}
.cfx-ps-search input{flex:1;border:none;background:none;outline:none;font-family:inherit;font-size:13.5px;color:var(--text)}
.cfx-ps-list{max-height:220px;overflow:auto;padding:5px}
.cfx-ps-opt{width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:none;background:none;
  border-radius:8px;cursor:pointer;font-family:inherit;text-align:left;color:var(--text)}
.cfx-ps-opt:hover,.cfx-ps-opt.is-sel{background:var(--surface-2)}
.cfx-ps-opt .cfx-ps-name{flex:1;font-size:13.5px}
.cfx-ps-empty{padding:16px;text-align:center;color:var(--text-muted);font-size:13px}

/* toast */
.cfx-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:10000;
  font-size:13.5px;font-weight:700;color:#fff;padding:12px 20px;border-radius:11px;box-shadow:var(--shadow-lg);
  animation:cfx-pop .2s ease}
.cfx-toast--ok{background:var(--ok)}.cfx-toast--crit{background:var(--crit)}

/* responsivo */
@media(max-width:860px){
  .cfx-kpis{grid-template-columns:repeat(2,1fr)}
  .cfx-kpis--3{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:680px){
  .cfx-kpis,.cfx-kpis--3{grid-template-columns:1fr 1fr}
  .cfx-head-actions{width:100%}.cfx-head-actions .cfx-btn{flex:1;justify-content:center}
  .cfx-tr--head{display:none}
  .cfx-tr,.cfx-table--mov .cfx-tr,.cfx-mvr{display:flex;flex-wrap:wrap;gap:8px 14px;padding:14px 16px;
    border-top:1px solid var(--border)}
  .cfx-td-name{width:100%;font-size:15px}
  .cfx-num{text-align:left;justify-self:start}
  .cfx-tr span[role="cell"]{display:flex;align-items:center;gap:6px;font-size:13px}
  .cfx-cl{display:inline;font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    color:var(--text-muted)}
  .cfx-form-row{grid-template-columns:1fr}
}
@media(max-width:430px){.cfx-kpis,.cfx-kpis--3{grid-template-columns:1fr}}
`;

export { Estoque };