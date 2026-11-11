import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Faq from './pages/Faq';
import Payment from './pages/Payment';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import ProductForm from './pages/admin/ProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Público */}
        <Route index element={<Home />} />
        <Route path="loja" element={<Shop />} />
        <Route path="produto/:id" element={<ProductDetail />} />
        <Route path="carrinho" element={<Cart />} />
        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Register />} />
        <Route path="sobre" element={<About />} />
        <Route path="faq" element={<Faq />} />

        {/* Usuário logado */}
        <Route element={<ProtectedRoute />}>
          <Route path="meus-pedidos" element={<MyOrders />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="pagamento/:id" element={<Payment />} />
        </Route>

        {/* Somente admin */}
        <Route path="admin" element={<ProtectedRoute role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="produtos/novo" element={<ProductForm />} />
            <Route path="produtos/:id/editar" element={<ProductForm />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="usuarios" element={<AdminUsers />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
