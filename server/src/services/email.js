/**
 * Envio de e-mails pelo Resend (https://resend.com).
 * Sem RESEND_API_KEY, os e-mails só aparecem no terminal (modo de teste).
 * Um erro no envio nunca derruba a compra: só fica registrado no log.
 */
const RESEND_URL = 'https://api.resend.com/emails';

const isTest = () => process.env.NODE_ENV === 'test' && !process.env.EMAIL_IN_TESTS;

async function sendEmail({ to, subject, html }) {
  if (isTest()) return { skipped: true };
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Tomanbin <onboarding@resend.dev>';

  if (!key) {
    console.log(`\n📧 [e-mail de teste] Para: ${to}\n   Assunto: ${subject}\n   ${htmlToText(html).slice(0, 400)}\n`);
    return { dev: true };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`Falha ao enviar e-mail "${subject}" para ${to}:`, err.message);
    return { error: err.message };
  }
}

function htmlToText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { sendEmail, isTest };
