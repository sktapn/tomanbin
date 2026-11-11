const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'user'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
    },
    // select: false -> a senha nunca volta nas consultas por padrão
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    cpf: { type: String, trim: true }, // usado na cobrança Pix (Asaas exige CPF)
    phone: { type: String, trim: true }, // último telefone usado em uma compra (preenche o próximo checkout)
    asaasCustomerId: { type: String },
  },
  { timestamps: true }
);

// Hash da senha com bcrypt antes de salvar
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// Remove campos sensíveis na resposta JSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.asaasCustomerId;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
