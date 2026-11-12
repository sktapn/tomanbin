/**
 * Endereços do site (frontend). CLIENT_URL aceita mais de um, separados por vírgula:
 *   CLIENT_URL=https://tomanbin.shop,https://tomanbin.vercel.app
 * - TODOS podem chamar a API (CORS e Socket.io)
 * - o PRIMEIRO é o endereço oficial, usado nos links dos e-mails e da prévia de compartilhamento
 */
const clean = (u) => u.trim().replace(/\/$/, '');

function clientUrls() {
  return String(process.env.CLIENT_URL || '')
    .split(',')
    .map(clean)
    .filter(Boolean);
}

function siteUrl() {
  return clientUrls()[0] || 'http://localhost:5173';
}

module.exports = { clientUrls, siteUrl };
