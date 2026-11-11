const mongoose = require('mongoose');

const { DELIVERY_METHODS } = require('../config/shipping');

const STATUSES = ['pendente', 'pago', 'enviado', 'entregue', 'cancelado'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // nome/preço "congelados" no momento da compra
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: String,
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (arr) => arr.length > 0, message: 'Pedido sem itens' },
    },
    subtotal: { type: Number, min: 0 }, // soma dos produtos
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, default: 'entrega' },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 }, // subtotal + frete
    status: { type: String, enum: STATUSES, default: 'pendente' },
    // Pagamento via Pix (Asaas)
    payment: {
      provider: { type: String, default: 'asaas' },
      attempts: { type: Number, default: 0 }, // quantos Pix já foram gerados (para idempotência)
      pixId: String,
      brCode: String, // código "copia e cola"
      brCodeBase64: String, // imagem do QR Code
      status: { type: String, default: 'PENDING' }, // PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
      devMode: Boolean, // true = cobrança de teste (sandbox)
      expiresAt: Date,
      paidAt: Date,
      paidAfterCancel: Boolean, // pagou depois do cancelamento (admin deve enviar ou estornar)
    },
    // Só existe quando deliveryMethod = 'entrega'
    shippingAddress: {
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zip: String,
    },
  },
  { timestamps: true }
);

// Entrega exige endereço
orderSchema.pre('validate', function requireAddress(next) {
  if (this.deliveryMethod === 'entrega') {
    const a = this.shippingAddress || {};
    if (!a.street || !a.city || !a.state || !a.zip) {
      this.invalidate('shippingAddress', 'Endereço de entrega é obrigatório');
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
