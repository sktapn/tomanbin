import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <nav className="footer-links" aria-label="Rodapé">
          <Link to="/loja">Loja</Link>
          <Link to="/sobre">Sobre</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/meus-pedidos">Meus pedidos</Link>
        </nav>
        <span>© 2026 Tomanbin · Feito com carinho</span>
      </div>
    </footer>
  );
}
