const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { checkCoupon } = require('../services/coupons');
const { shippingConfig } = require('../config/shipping');
const customProducts = require('../services/customProducts');

// POST /api/coupons/validate — prévia do desconto no carrinho (preços vêm do banco)
exports.validate = asyncHandler(async (req, res) => {
  const { code, items, deliveryMethod } = req.body;
  const ids = items.filter((it) => it.product).map((it) => it.product);
  const products = ids.length ? await Product.find({ _id: { $in: ids }, active: true }).select('price') : [];
  const price = Object.fromEntries(products.map((p) => [String(p._id), p.price]));
  const cfg = items.some((it) => it.custom) ? await customProducts.getConfig() : null;
  const unit = (it) =>
    it.custom ? cfg.options.find((o) => o.id === it.custom.optionId && o.active)?.price || 0 : price[it.product] || 0;
  const subtotal = Math.round(items.reduce((s, it) => s + unit(it) * it.quantity, 0) * 100) / 100;
  const shippingFee = deliveryMethod === 'entrega' ? shippingConfig().fee : 0;

  const { coupon, discount } = await checkCoupon(code, {
    userId: req.user?._id,
    subtotal,
    shippingFee,
    deliveryMethod,
  });
  res.json({ code: coupon.code, type: coupon.type, value: coupon.value, discount });
});

// GET /api/coupons/banner (público) — cupom em destaque na faixa da loja.
// Some sozinho quando o cupom expira, esgota ou é desativado.
exports.banner = asyncHandler(async (_req, res) => {
  const now = new Date();
  const coupon = await Coupon.findOne({
    showInBanner: true,
    active: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ maxUses: 0 }, { $expr: { $lt: ['$uses', '$maxUses'] } }] },
    ],
  }).sort({ updatedAt: -1 });
  if (!coupon) return res.json(null);
  res.json({ code: coupon.code, message: coupon.bannerText || defaultBannerText(coupon) });
});

function defaultBannerText(c) {
  if (c.type === 'frete') return `Frete grátis com o cupom ${c.code}`;
  const off = c.type === 'percentual' ? `${c.value}%` : `R$ ${c.value.toFixed(2).replace('.', ',')}`;
  return `Use o cupom ${c.code} e ganhe ${off} de desconto`;
}

// Só um cupom fica na faixa por vez
async function keepSingleBanner(coupon) {
  if (coupon?.showInBanner) {
    await Coupon.updateMany({ _id: { $ne: coupon._id }, showInBanner: true }, { showInBanner: false });
  }
}

// ---------- Admin ----------
exports.list = asyncHandler(async (_req, res) => {
  res.json(await Coupon.find().sort({ createdAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  if (await Coupon.exists({ code: req.body.code })) throw new AppError('Já existe um cupom com esse código', 409);
  const coupon = await Coupon.create(req.body);
  await keepSingleBanner(coupon);
  res.status(201).json(coupon);
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.code && (await Coupon.exists({ code: req.body.code, _id: { $ne: req.params.id } }))) {
    throw new AppError('Já existe um cupom com esse código', 409);
  }
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) throw new AppError('Cupom não encontrado', 404);
  await keepSingleBanner(coupon);
  res.json(coupon);
});

exports.remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError('Cupom não encontrado', 404);
  res.status(204).end();
});
