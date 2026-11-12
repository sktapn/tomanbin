/**
 * Imagens guardadas com endereço de desenvolvimento (http://localhost:5001/static/...)
 * viram o endereço público da API quando o site está no ar (API_PUBLIC_URL).
 * Assim os produtos de exemplo funcionam no ar sem precisar mexer no banco.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?=\/static\/)/i;

function publicUrl(url) {
  const base = process.env.API_PUBLIC_URL;
  if (!base || typeof url !== 'string') return url;
  return url.replace(LOCAL, base.replace(/\/$/, ''));
}

module.exports = publicUrl;
