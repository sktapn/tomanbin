import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const handleLogout = () => {
    signOut();
    close();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-left" />

        <Link to="/" className="logo" onClick={close} aria-label="Tomanbin — página inicial">
          Tomanbin
        </Link>

        <button
          className="pill nav-toggle"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '✕' : '☰'}
        </button>

        <nav className={`header-right ${open ? 'open' : ''}`} aria-label="Conta">
          {user && <NavLink to="/meus-pedidos" className="pill" onClick={close}>Pedidos</NavLink>}
          {isAdmin && <NavLink to="/admin" className="pill pill-yellow" onClick={close}>Painel</NavLink>}
          {user ? (
            <>
              <NavLink to="/perfil" className="pill" onClick={close} title="Meu perfil">
                Oi, {user.name.split(' ')[0]}
              </NavLink>
              <button className="pill" onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <NavLink to="/login" className="pill" onClick={close}>Entrar</NavLink>
          )}
          <NavLink to="/carrinho" className="pill pill-wine" onClick={close}>
            Carrinho ({count})
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
