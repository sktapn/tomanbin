const mongoose = require('mongoose');

/**
 * Imagem enviada por um cliente para um produto personalizado.
 * Só imagens registradas aqui (e do próprio cliente) podem entrar num pedido:
 * ninguém consegue pedir um button com uma URL qualquer da internet.
 */
const customArtSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

customArtSchema.index({ user: 1, url: 1 });

module.exports = mongoose.model('CustomArt', customArtSchema);
