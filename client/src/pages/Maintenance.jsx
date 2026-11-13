import { STORE } from '../config';
import { whatsappLink } from '../utils';

/** O que o cliente vê enquanto a loja está em manutenção (o admin liga/desliga no Dashboard) */
export default function Maintenance({ message }) {
  return (
    <main className="maintenance">
      <div className="maintenance-card card">
        <span className="logo maintenance-logo">{STORE.name}</span>
        <div className="maintenance-icon" aria-hidden="true">🛠️</div>
        <h1>Voltamos já!</h1>
        <p>{message}</p>
        {STORE.whatsapp && (
          <a
            className="btn btn-primary"
            href={whatsappLink(STORE.whatsapp, 'Oi! Vi que a loja está em manutenção e queria tirar uma dúvida 😊')}
            target="_blank"
            rel="noreferrer"
          >
            Fale com a gente no WhatsApp
          </a>
        )}
        {STORE.instagram && (
          <p className="muted maintenance-small">
            Novidades no Instagram:{' '}
            <a href={`https://instagram.com/${STORE.instagram}`} target="_blank" rel="noreferrer">@{STORE.instagram}</a>
          </p>
        )}
      </div>
    </main>
  );
}
