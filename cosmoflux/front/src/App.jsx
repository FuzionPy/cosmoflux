import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'

// Páginas — crie cada uma em src/pages/ conforme precisar
import Produtos     from './pages/produtos'
import Estoque      from './pages/estoque'
import Entradas     from './pages/entradas'
import Saidas       from './pages/saidas'
import Pedidos      from './pages/pedidos'
import Relatorios   from './pages/relatorios'
import Lucros       from './pages/lucros'
import Clientes     from './pages/clientes'
import Fornecedores from './pages/fornecedores'
import Usuarios from './pages/usuarios'

// Placeholder para páginas ainda não criadas
const EmBreve = ({ nome }) => (
  <div style={{
    padding: 40, color: 'rgba(232,234,237,0.3)',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 12
  }}>
    <span style={{ fontSize: 20 }}>◫</span>
    Página <strong style={{ color: 'rgba(232,234,237,0.6)' }}>{nome}</strong> em construção.
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/" element={<Login />} />

        {/* Protegidas — todas compartilham o Layout (Sidebar + Topbar) */}
        <Route element={<Layout />}>
          <Route path="/menu"         element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/entradas" element={<Entradas />} />
          <Route path="/saidas"   element={<Saidas />} />
          <Route path="/pedidos"  element={<Pedidos />} />
          <Route path="/relatorios"   element={<Relatorios />} />
          <Route path="/lucros" element={<Lucros />} />
          <Route path="/clientes" element={<Clientes/>} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}