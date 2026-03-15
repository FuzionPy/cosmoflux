import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './services/authService'
import Login from './pages/login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Produtos     from './pages/produtos'
import Estoque      from './pages/estoque'
import Entradas     from './pages/entradas'
import Saidas       from './pages/saidas'
import Pedidos      from './pages/pedidos'
import Relatorios   from './pages/relatorios'
import Lucros       from './pages/lucros'
import Clientes     from './pages/clientes'
import Fornecedores from './pages/fornecedores'
import Usuarios     from './pages/usuarios'

// Redireciona para /menu se já logado, senão mostra o Login
const PublicRoute = ({ children }) => {
  return getToken() ? <Navigate to="/menu" replace /> : children;
};

// Redireciona para / se não logado
const PrivateRoute = ({ children }) => {
  return getToken() ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        <Route element={
          <PrivateRoute><Layout /></PrivateRoute>
        }>
          <Route path="/menu"         element={<Dashboard />} />
          <Route path="/produtos"     element={<Produtos />} />
          <Route path="/estoque"      element={<Estoque />} />
          <Route path="/entradas"     element={<Entradas />} />
          <Route path="/saidas"       element={<Saidas />} />
          <Route path="/pedidos"      element={<Pedidos />} />
          <Route path="/relatorios"   element={<Relatorios />} />
          <Route path="/lucros"       element={<Lucros />} />
          <Route path="/clientes"     element={<Clientes />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/usuarios"     element={<Usuarios />} />
        </Route>

        {/* Qualquer rota desconhecida vai para / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}