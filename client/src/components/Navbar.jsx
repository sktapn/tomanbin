import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import SocialIcons from './SocialIcons';
import { CATEGORY_LABELS } from '../utils';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false); // submenu "Coleções" aberto
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const current = pathname === '/loja' ? new URLSearchParams(search).get('categoria') || '' : null;
  const close = () => { setOpen(false); setSub(false); };

  // Menu do celular ocupa a tela toda: trava a rolagem da página por trás
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
          <img src="/logo-nome.png" alt="Tomanbin" className="logo-img" />
        </Link>

        <button
          className="pill nav-toggle"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          ☰
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

      {/* Menu do celular: tela cheia, lista simples e "Coleções" abre as categorias */}
      {open && (
        <div className="mmenu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mmenu-top">
            {sub ? (
              <button className="mmenu-back" onClick={() => setSub(false)} aria-label="Voltar">‹ Voltar</button>
            ) : (
              <button className="mmenu-close" aria-label="Fechar menu" onClick={close}>✕</button>
            )}
            <Link to="/" onClick={close} aria-label="Tomanbin — página inicial">
              <img src="/logo-nome.png" alt="Tomanbin" className="mmenu-logo" />
            </Link>
            {sub ? (
              <button className="mmenu-close" aria-label="Fechar menu" onClick={close}>✕</button>
            ) : (
              <span />
            )}
          </div>

          {sub ? (
            <nav className="mmenu-list" aria-label="Coleções">
              <span className="mmenu-title">Coleções</span>
              <Link to="/loja" onClick={close} className={current === '' ? 'active' : ''}>Todos os produtos</Link>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <Link key={key} to={`/loja?categoria=${key}`} onClick={close} className={current === key ? 'active' : ''}>
                  {label}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="mmenu-list" aria-label="Menu principal">
              <Link to="/" onClick={close}>Início</Link>
              <button onClick={() => setSub(true)}>Coleções <span aria-hidden="true">›</span></button>
              <Link to="/personalizado" onClick={close}>Faça o seu ✨</Link>
              <Link to="/carrinho" onClick={close}>Carrinho{count ? ` (${count})` : ''}</Link>
              {user && <Link to="/meus-pedidos" onClick={close}>Meus pedidos</Link>}
              {isAdmin && <Link to="/admin" onClick={close}>Painel da loja</Link>}
              <Link to="/sobre" onClick={close}>Sobre</Link>
              <Link to="/faq" onClick={close}>Dúvidas</Link>
            </nav>
          )}

          <div className="mmenu-foot">
            {user ? (
              <p>
                <span aria-hidden="true">👤</span>{' '}
                <Link to="/perfil" onClick={close}>Oi, {user.name.split(' ')[0]}</Link>
                {'  /  '}
                <button onClick={handleLogout}>Sair</button>
              </p>
            ) : (
              <p>
                <span aria-hidden="true">👤</span>{' '}
                <Link to="/login" onClick={close}>Entrar</Link>
                {'  /  '}
                <Link to="/cadastro" onClick={close}>Criar uma conta</Link>
              </p>
            )}
            <SocialIcons />
          </div>
        </div>
      )}
    </header>
  );
}
