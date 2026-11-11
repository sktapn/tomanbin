const mongoose = require('mongoose');

// percentual: X% dos produtos · valor: R$ X dos produtos · frete: frete grátis
const COUPON_TYPES = ['percentual', 'valor', 'frete'];

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 }, // % ou R$ (ignorado no frete grátis)
    minSubtotal: { type: Number, default: 0, min: 0 }, // compra mínima em produtos
    maxUses: { type: Number, default: 0, min: 0 }, // 0 = ilimitado
    uses: { type: Number, default: 0, min: 0 },
    onePerCustomer: { type: Boolean, default: false },
    expiresAt: Date,
    active: { type: Boolean, default: true },
    showInBanner: { type: Boolean, default: false }, // aparece na faixa animada da loja
    bannerText: { type: String, trim: true, maxlength: 120 }, // mensagem da faixa (opcional)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
module.exports.COUPON_TYPES = COUPON_TYPES;
