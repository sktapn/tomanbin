const mongoose = require('mongoose');
const publicUrl = require('../utils/publicUrl');

const CATEGORIES = ['buttons', 'chaveiros', 'action-figures'];
const TAGS = ['', 'novo', 'edicao-limitada', 'mais-vendido'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    price: { type: Number, required: true, min: [0, 'Preço não pode ser negativo'] },
    category: { type: String, enum: CATEGORIES, required: true },
    images: {
      type: [String],
      validate: { validator: (arr) => arr.length <= 6, message: 'Máximo de 6 imagens' },
      default: [],
    },
    stock: { type: Number, default: 0, min: [0, 'Estoque não pode ser negativo'] },
    tag: { type: String, enum: TAGS, default: '' }, // selo exibido no card
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

// Endereço público das imagens (ver utils/publicUrl.js)
productSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if (Array.isArray(ret.images)) ret.images = ret.images.map(publicUrl);
    return ret;
  },
});

module.exports = mongoose.model('Product', productSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.TAGS = TAGS;
