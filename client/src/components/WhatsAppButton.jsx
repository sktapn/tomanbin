import { useLocation } from 'react-router-dom';
import { STORE } from '../config';
import { whatsappLink } from '../utils';

/** Botão flutuante do WhatsApp. Na página de um produto, a mensagem já leva o link dele. */
export default function WhatsAppButton() {
  const { pathname } = useLocation();
  // fora do painel e das telas de pagamento (não cobrir os campos do formulário)
  if (!STORE.whatsapp || /^\/(admin|carrinho|pagamento)/.test(pathname)) return null;

  const text = pathname.startsWith('/produto/')
    ? `Oi! Tenho uma dúvida sobre este produto: ${window.location.href}`
    : 'Oi! Vim pelo site da Tomanbin e tenho uma dúvida 😊';

  return (
    <a
      className="wa-float"
      href={whatsappLink(STORE.whatsapp, text)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a loja no WhatsApp"
      title="Falar com a loja no WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.8C5.1 10 10 5.2 16 5.2s10.9 4.8 10.9 10.6S22 26.4 16 26.4zm6-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"
        />
      </svg>
      <span className="wa-label">Fale com a gente</span>
    </a>
  );
}
