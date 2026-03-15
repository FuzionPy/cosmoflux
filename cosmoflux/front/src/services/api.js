import { getToken } from './authService';

const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Erro na requisição');
  return data;
}

// ── Dashboard ──────────────────────────────────────────────────────
export const getKPIs             = () => api('/dashboard/kpis');
export const getVendasPorMes     = () => api('/dashboard/vendas-por-mes');

// ── Produtos ───────────────────────────────────────────────────────
export const getProdutos         = () => api('/produtos');
export const criarProduto        = (dados) => api('/produtos', { method: 'POST', body: JSON.stringify(dados) });
export const atualizarProduto    = (id, dados) => api(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
export const deletarProduto      = (id) => api(`/produtos/${id}`, { method: 'DELETE' });

// ── Estoque ────────────────────────────────────────────────────────
export const getAlertasEstoque      = () => api('/estoque/alertas');
export const getMovimentacoes       = (params = '') => api(`/movimentacoes${params}`);
export const registrarMovimentacao  = (dados) => api('/movimentacoes', { method: 'POST', body: JSON.stringify(dados) });

// ── Categorias ─────────────────────────────────────────────────────
export const getCategorias       = () => api('/categorias');
export const criarCategoria      = (dados) => api('/categorias', { method: 'POST', body: JSON.stringify(dados) });

// ── Fornecedores ───────────────────────────────────────────────────
export const getFornecedores         = () => api('/fornecedores');
export const criarFornecedor         = (dados) => api('/fornecedores', { method: 'POST', body: JSON.stringify(dados) });
export const atualizarFornecedor     = (id, dados) => api(`/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
export const deletarFornecedor       = (id) => api(`/fornecedores/${id}`, { method: 'DELETE' });
export const getProdutosFornecedor   = (id) => api(`/fornecedores/${id}/produtos`);

// ── Clientes ───────────────────────────────────────────────────────
export const getClientes         = () => api('/clientes');
export const getCliente          = (id) => api(`/clientes/${id}`);
export const criarCliente        = (dados) => api('/clientes', { method: 'POST', body: JSON.stringify(dados) });
export const atualizarCliente    = (id, dados) => api(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
export const deletarCliente      = (id) => api(`/clientes/${id}`, { method: 'DELETE' });

// ── Vendas / Parcelas ──────────────────────────────────────────────
export const criarVenda          = (dados) => api('/vendas', { method: 'POST', body: JSON.stringify(dados) });
export const pagarParcela        = (id, dados) => api(`/parcelas/${id}/pagar`, { method: 'PATCH', body: JSON.stringify(dados) });
export const getAlertasPagamentos= () => api('/alertas/pagamentos');

// ── Pedidos ────────────────────────────────────────────────────────
export const getPedidos          = (status = '') => api(`/pedidos${status ? `?status=${status}` : ''}`);
export const criarPedido         = (dados) => api('/pedidos', { method: 'POST', body: JSON.stringify(dados) });
export const atualizarStatus     = (id, status) => api(`/pedidos/${id}/status?status=${status}`, { method: 'PATCH' });
export const cancelarPedido      = (id) => api(`/pedidos/${id}`, { method: 'DELETE' });

// ── Lucros ─────────────────────────────────────────────────────────
export const getLucrosResumo     = () => api('/lucros/resumo');
export const getLucrosMensal     = (ano) => api(`/lucros/mensal${ano ? `?ano=${ano}` : ''}`);
export const getLucrosPorProduto = () => api('/lucros/por-produto');

// ── Relatórios ─────────────────────────────────────────────────────
export const getResumoGeral      = () => api('/relatorios/resumo-geral');
export const getVendasPeriodo    = (inicio, fim) => api(`/relatorios/vendas-periodo?inicio=${inicio}&fim=${fim}`);
export const getEstoqueSnapshot  = () => api('/relatorios/estoque-snapshot');