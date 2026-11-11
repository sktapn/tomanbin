import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin">
      <nav className="admin-tabs">
        <NavLink to="/admin" end>📊 Dashboard</NavLink>
        <NavLink to="/admin/produtos">🧸 Produtos</NavLink>
        <NavLink to="/admin/pedidos">📦 Pedidos</NavLink>
        <NavLink to="/admin/cupons">🏷️ Cupons</NavLink>
        <NavLink to="/admin/usuarios">👥 Usuários</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
