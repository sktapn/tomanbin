import { Link } from 'react-router-dom';
import { STORE } from '../config';
import { maskPhone, whatsappLink } from '../utils';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <nav className="footer-col" aria-label="Loja">
            <h3>Loja</h3>
            <Link to="/loja">Produtos</Link>
            <Link to="/personalizado">Faça o seu</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/meus-pedidos">Meus pedidos</Link>
          </nav>
          <nav className="footer-col" aria-label="Políticas">
            <h3>Políticas</h3>
            <Link to="/trocas">Trocas e devoluções</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
          </nav>
          <div className="footer-col">
            <h3>Contato</h3>
            <a href={whatsappLink(STORE.whatsapp)} target="_blank" rel="noreferrer">WhatsApp {maskPhone(STORE.whatsapp)}</a>
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            <a href={`https://instagram.com/${STORE.instagram}`} target="_blank" rel="noreferrer">@{STORE.instagram}</a>
          </div>
        </div>
        <div className="footer-legal">
          {STORE.legalName} · {STORE.document} · {STORE.address} · © {new Date().getFullYear()} {STORE.name} · Feito com carinho
        </div>
      </div>
    </footer>
  );
}
