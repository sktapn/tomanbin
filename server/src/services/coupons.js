const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');

const round = (n) => Math.round(n * 100) / 100;
const brl = (n) => `R$ ${n.toFixed(2).replace('.', ',')}`;

/** Quanto o cupom desconta (sempre calculado no servidor) */
function computeDiscount(coupon, subtotal, shippingFee) {
  if (coupon.type === 'frete') return round(shippingFee);
  const raw = coupon.type === 'percentual' ? (subtotal * coupon.value) / 100 : coupon.value;
  return round(Math.min(raw, subtotal)); // nunca desconta mais do que o valor dos produtos
}

/**
 * Confere se o cupom pode ser usado nesta compra. Lança AppError com o motivo.
 * Não reserva nada: só valida e calcula.
 */
async function checkCoupon(code, { userId, subtotal, shippingFee, deliveryMethod }) {
  const clean = String(code || '').trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: clean });
  if (!coupon || !coupon.active) throw new AppError('Cupom inválido', 400);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Este cupom expirou', 400);
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) throw new AppError('Este cupom já esgotou', 400);
  if (subtotal < coupon.minSubtotal) {
    throw new AppError(`Este cupom vale para compras a partir de ${brl(coupon.minSubtotal)} em produtos`, 400);
  }
  if (coupon.type === 'frete' && deliveryMethod !== 'entrega') {
    throw new AppError('Cupom de frete grátis só vale para entrega', 400);
  }
  if (coupon.onePerCustomer && userId) {
    const used = await Order.exists({ user: userId, couponCode: coupon.code, status: { $ne: 'cancelado' } });
    if (used) throw new AppError('Você já usou este cupom', 400);
  }
  return { coupon, discount: computeDiscount(coupon, subtotal, shippingFee) };
}

/** Conta um uso de forma atômica (só se ainda houver usos disponíveis) */
async function reserveUse(coupon) {
  const ok = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      active: true,
      $or: [{ maxUses: 0 }, { $expr: { $lt: ['$uses', '$maxUses'] } }],
    },
    { $inc: { uses: 1 } },
    { new: true }
  );
  if (!ok) throw new AppError('Este cupom já esgotou', 400);
}

/** Devolve o uso quando o pedido é cancelado */
async function releaseUse(order) {
  if (!order.couponCode) return;
  await Coupon.updateOne({ code: order.couponCode, uses: { $gt: 0 } }, { $inc: { uses: -1 } }).catch(() => {});
}

module.exports = { computeDiscount, checkCoupon, reserveUse, releaseUse };
