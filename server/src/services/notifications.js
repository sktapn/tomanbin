/**
 * Avisos por e-mail dos pedidos. Rodam "por fora" (sem await na rota),
 * então um problema no e-mail nunca atrasa nem quebra a compra.
 */
const User = require('../models/User');
const email = require('./email');
const tpl = require('./emailTemplates');

// Evita e-mail duplicado quando o webhook e a conferência automática chegam juntos
const sent = new Set();
function once(key) {
  if (sent.has(key)) return false;
  sent.add(key);
  if (sent.size > 5000) sent.delete(sent.values().next().value);
  return true;
}

async function notify(kind, order) {
  if (email.isTest()) return;
  if (!once(`${order._id}:${kind}${kind === 'shipped' ? `:${order.trackingCode || ''}` : ''}`)) return;
  const user = await User.findById(order.user).select('name email');
  if (!user) return;
  const make = { received: tpl.orderReceived, paid: tpl.orderPaid, shipped: tpl.orderShipped }[kind];
  await email.sendEmail({ to: user.email, ...make(order, user) });

  // Aviso para a loja quando entra um pedido pago
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (kind === 'paid' && admin) await email.sendEmail({ to: admin, ...tpl.adminNewPaidOrder(order, user) });
}

/** Dispara sem esperar; erros só vão para o log */
exports.notifyOrder = (kind, order) => {
  notify(kind, order).catch((err) => console.error(`Aviso por e-mail (${kind}):`, err.message));
};

/** E-mail de boas-vindas para quem acabou de criar a conta (sem esperar) */
exports.notifyWelcome = (user) => {
  if (email.isTest()) return;
  email.sendEmail({ to: user.email, ...tpl.welcome(user) }).catch((err) => console.error('E-mail de boas-vindas:', err.message));
};
