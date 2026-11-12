/**
 * Prévia bonita ao compartilhar um produto (WhatsApp, Instagram, Facebook...).
 * Esses apps não rodam o React: leem só as tags <meta> do HTML.
 * Então esta rota devolve um HTML pequeno com as tags do produto
 * e manda a pessoa para a página de verdade da loja.
 */
const Product = require('../models/Product');
const CATEGORY_LABELS = { buttons: 'Buttons', chaveiros: 'Chaveiros', 'action-figures': 'Action Figures' };

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const brl = (n) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
const site = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

/** WhatsApp não mostra SVG: usa a foto do Cloudinary no formato 1200×630, ou a imagem padrão da loja */
function previewImage(url) {
  if (url && /res\.cloudinary\.com\/.+\/image\/upload\//.test(url)) {
    return url.replace('/image/upload/', '/image/upload/c_pad,b_rgb:fffaf6,w_1200,h_630,f_jpg,q_auto/');
  }
  if (url && /\.(jpe?g|png|webp)(\?|$)/i.test(url)) return url;
  return `${site()}/og-image.png`;
}

function page({ title, description, image, url }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Tomanbin">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(url)}">
<link rel="canonical" href="${esc(url)}">
</head><body><p>Abrindo <a href="${esc(url)}">${esc(title)}</a>…</p></body></html>`;
}

// GET /share/produto/:id
exports.product = async (req, res) => {
  const id = String(req.params.id);
  const url = `${site()}/produto/${encodeURIComponent(id)}`;
  let product = null;
  if (/^[a-f0-9]{24}$/i.test(id)) {
    product = await Product.findOne({ _id: id, active: true }).select('name price category description images stock').catch(() => null);
  }
  if (!product) return res.redirect(302, `${site()}/loja`);

  const category = CATEGORY_LABELS[product.category] || '';
  const status = product.stock > 0 ? 'Pronta entrega em Boa Vista' : 'Esgotado';
  const description = [brl(product.price), category, status].filter(Boolean).join(' · ') +
    (product.description ? ` — ${product.description.slice(0, 120)}` : '');

  res.set('Cache-Control', 'public, max-age=600');
  res.type('html').send(page({ title: `${product.name} | Tomanbin`, description, image: previewImage(product.images?.[0]), url }));
};
