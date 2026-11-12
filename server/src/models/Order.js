const mongoose = require('mongoose');

const { DELIVERY_METHODS } = require('../config/shipping');

const STATUSES = ['pendente', 'pago', 'enviado', 'entregue', 'cancelado'];

const orderItemSchema = new mongoose.Schema(
  {
    // produto do catálogo OU item personalizado (custom)
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    custom: {
      optionId: String, // ex: "button-m"
      imageUrl: String, // arte enviada pelo cliente (original, para impressão)
      notes: String, // ex: nome no chaveiro
    },
    // nome/preço "congelados" no momento da compra
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: String,
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

orderItemSchema.pre('validate', function itemKind(next) {
  if (!this.product && !this.custom?.optionId) this.invalidate('product', 'Item sem produto');
  next();
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (arr) => arr.length > 0, message: 'Pedido sem itens' },
    },
    subtotal: { type: Number, min: 0 }, // soma dos produtos
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, default: 'entrega' },
    contactPhone: String, // telefone/WhatsApp do cliente (só números)
    trackingCode: String, // código de rastreio (Correios etc.)
    shippingFee: { type: Number, default: 0, min: 0 },
    couponCode: String, // cupom usado (se houver)
    discount: { type: Number, default: 0, min: 0 }, // desconto do cupom (produtos ou frete)
    total: { type: Number, required: true, min: 0 }, // subtotal + frete - desconto
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
