/** Modelos dos e-mails da loja (HTML simples, funciona em qualquer leitor de e-mail) */

const STORE = () => process.env.STORE_NAME || 'Tomanbin';
const siteUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

// Escapa texto vindo do usuário (nome, endereço) para não virar HTML
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const brl = (n = 0) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
const shortId = (id) => String(id).slice(-6).toUpperCase();

const WINE = '#7b1d3a';

function layout(title, body) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Language" content="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fffaf6;font-family:Arial,Helvetica,sans-serif;color:#2b1419">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:3px solid #2b1419;border-radius:12px">
<tr><td style="background:${WINE};color:#fff;padding:18px 24px;border-radius:9px 9px 0 0;font-size:24px;font-weight:bold">${esc(STORE())}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px;color:${WINE}">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #eee;font-size:12px;color:#6e5a5f">
Você recebeu este e-mail por causa de uma compra ou da sua conta na ${esc(STORE())}.
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:${WINE};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${label}</a></p>`;

function itemsTable(order) {
  const rows = order.items
    .map((it) => `<tr><td style="padding:6px 0">${it.quantity}× ${esc(it.name)}</td><td align="right">${brl(it.price * it.quantity)}</td></tr>`)
    .join('');
  const line = (label, value) => `<tr><td style="padding:4px 0;color:#6e5a5f">${label}</td><td align="right" style="color:#6e5a5f">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0">
${rows}
<tr><td colspan="2" style="border-top:1px solid #eee;padding-top:6px"></td></tr>
${line('Produtos', brl(order.subtotal ?? order.total))}
${line('Frete', order.shippingFee ? brl(order.shippingFee) : 'Grátis')}
${order.discount ? line(`Cupom ${esc(order.couponCode)}`, `− ${brl(order.discount)}`) : ''}
<tr><td style="padding-top:6px;font-weight:bold">Total</td><td align="right" style="padding-top:6px;font-weight:bold">${brl(order.total)}</td></tr>
</table>`;
}

function delivery(order) {
  if (order.deliveryMethod === 'retirada') return '<p>🏪 <b>Retirada na loja.</b> Avisamos quando estiver pronto.</p>';
  const a = order.shippingAddress || {};
  return `<p>🚚 <b>Entrega em:</b> ${esc(a.street)}, ${esc(a.number)}${a.complement ? ` - ${esc(a.complement)}` : ''}, ${esc(a.neighborhood)}, ${esc(a.city)}/${esc(a.state)} · CEP ${esc(a.zip)}</p>`;
}

exports.orderReceived = (order, user) => ({
  subject: `Recebemos seu pedido #${shortId(order._id)}`,
  html: layout(
    `Oi, ${esc(user.name.split(' ')[0])}! Recebemos seu pedido 💌`,
    `<p>Seu pedido <b>#${shortId(order._id)}</b> está aguardando o pagamento por Pix.
O estoque fica reservado por 24 horas.</p>
${itemsTable(order)}
${delivery(order)}
${button(`${siteUrl()}/pagamento/${order._id}`, 'Pagar com Pix')}`
  ),
});

exports.orderPaid = (order, user) => ({
  subject: `Pagamento confirmado — pedido #${shortId(order._id)}`,
  html: layout(
    'Pagamento confirmado! 🎉',
    `<p>Oi, ${esc(user.name.split(' ')[0])}! O Pix do pedido <b>#${shortId(order._id)}</b> foi confirmado.
${order.deliveryMethod === 'retirada' ? 'Avisamos quando estiver pronto para retirada.' : 'Agora é com a gente: enviamos em até 3 dias úteis e mandamos o código de rastreio por aqui.'}</p>
${itemsTable(order)}
${button(`${siteUrl()}/meus-pedidos`, 'Ver meus pedidos')}`
  ),
});

exports.orderShipped = (order, user) => {
  const code = order.trackingCode ? esc(order.trackingCode) : '';
  return {
    subject: `Seu pedido #${shortId(order._id)} foi enviado 📦`,
    html: layout(
      'Seu pedido está a caminho! 📦',
      `<p>Oi, ${esc(user.name.split(' ')[0])}! O pedido <b>#${shortId(order._id)}</b> foi enviado.</p>
${code ? `<p>Código de rastreio: <b style="font-size:18px;letter-spacing:1px">${code}</b></p>
${button(`https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(order.trackingCode)}`, 'Rastrear nos Correios')}` : ''}
${delivery(order)}`
    ),
  };
};

exports.adminNewPaidOrder = (order, user) => ({
  subject: `💰 Novo pedido pago #${shortId(order._id)} — ${brl(order.total)}`,
  html: layout(
    'Novo pedido pago',
    `<p><b>${esc(user.name)}</b> (${esc(user.email)}) pagou o pedido <b>#${shortId(order._id)}</b>.</p>
${itemsTable(order)}
${delivery(order)}
${button(`${siteUrl()}/admin/pedidos`, 'Abrir painel de pedidos')}`
  ),
});

exports.passwordReset = (user, link) => ({
  subject: 'Redefinir sua senha',
  html: layout(
    'Esqueceu a senha? Sem problema',
    `<p>Oi, ${esc(user.name.split(' ')[0])}! Clique no botão abaixo para criar uma senha nova.
O link vale por <b>1 hora</b> e só pode ser usado uma vez.</p>
${button(link, 'Criar nova senha')}
<p style="font-size:13px;color:#6e5a5f">Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.</p>`
  ),
});

exports._test = { esc };
