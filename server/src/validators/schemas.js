const Joi = require('joi');
const { CATEGORIES, TAGS } = require('../models/Product');
const { STATUSES } = require('../models/Order');
const { ROLES } = require('../models/User');
const { DELIVERY_METHODS } = require('../config/shipping');
const { COUPON_TYPES } = require('../models/Coupon');
const { OPTION_IDS } = require('../services/customProducts');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'ID inválido',
  'string.length': 'ID inválido',
});

const msgs = {
  'string.empty': '{#label} é obrigatório',
  'any.required': '{#label} é obrigatório',
  'string.email': 'E-mail inválido',
  'string.min': '{#label} deve ter pelo menos {#limit} caracteres',
  'any.only': '{#label} inválido(a)',
};

// ---------- Auth ----------
const register = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().label('Nome'),
  email: Joi.string().trim().lowercase().email().required().label('E-mail'),
  password: Joi.string().min(6).max(100).required().label('Senha'),
}).messages(msgs);

const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('E-mail'),
  password: Joi.string().max(100).required().label('Senha'),
}).messages(msgs);

const forgotPassword = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('E-mail'),
}).messages(msgs);

const resetPassword = Joi.object({
  token: Joi.string().hex().length(64).required().messages({
    'string.hex': 'Link inválido ou expirado. Peça um novo.',
    'string.length': 'Link inválido ou expirado. Peça um novo.',
    'string.empty': 'Link inválido ou expirado. Peça um novo.',
    'any.required': 'Link inválido ou expirado. Peça um novo.',
  }),
  password: Joi.string().min(6).max(100).required().label('Nova senha'),
}).messages(msgs);

// ---------- Users ----------
const updateMe = Joi.object({
  name: Joi.string().trim().min(2).max(80).label('Nome'),
  password: Joi.string().min(6).max(100).label('Nova senha'),
  // Para trocar a senha é obrigatório informar a senha atual
  currentPassword: Joi.string().max(100).label('Senha atual').when('password', {
    is: Joi.exist(),
    then: Joi.required(),
  }),
})
  .or('name', 'password')
  .messages({ ...msgs, 'object.missing': 'Nada para atualizar' });

const adminUpdateUser = Joi.object({
  name: Joi.string().trim().min(2).max(80).label('Nome'),
  role: Joi.string().valid(...ROLES).label('Perfil'),
})
  .min(1)
  .messages({ ...msgs, 'object.min': 'Nada para atualizar' });

// ---------- Products ----------
const productBase = {
  name: Joi.string().trim().max(120).label('Nome'),
  description: Joi.string().allow('').max(2000).label('Descrição'),
  price: Joi.number().min(0.5).max(100000).precision(2).label('Preço'),
  category: Joi.string().valid(...CATEGORIES).label('Categoria'),
  images: Joi.array().items(Joi.string().uri({ scheme: ['http', 'https'] }).max(500)).max(6).label('Imagens'),
  stock: Joi.number().integer().min(0).label('Estoque'),
  tag: Joi.string().valid(...TAGS).label('Selo'),
  active: Joi.boolean().label('Ativo'),
};

const createProduct = Joi.object({
  ...productBase,
  name: productBase.name.required(),
  price: productBase.price.required(),
  category: productBase.category.required(),
}).messages(msgs);

const updateProduct = Joi.object(productBase).min(1).messages({ ...msgs, 'object.min': 'Nada para atualizar' });

const listProducts = Joi.object({
  category: Joi.string().valid(...CATEGORIES),
  tag: Joi.string().valid(...TAGS.filter(Boolean)),
  search: Joi.string().trim().max(100).allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sort: Joi.string().valid('recent', 'price_asc', 'price_desc', 'name').default('recent'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
  all: Joi.boolean().default(false), // admin: inclui inativos
});

// ---------- Orders ----------
const addressSchema = Joi.object({
  street: Joi.string().trim().max(120).required().label('Rua'),
  number: Joi.string().trim().max(20).required().label('Número'),
  complement: Joi.string().trim().max(80).allow('').label('Complemento'),
  neighborhood: Joi.string().trim().max(80).required().label('Bairro'),
  city: Joi.string().trim().max(80).required().label('Cidade'),
  state: Joi.string().trim().length(2).uppercase().required().label('UF'),
  zip: Joi.string().trim().pattern(/^\d{5}-?\d{3}$/).required().label('CEP')
    .messages({ 'string.pattern.base': 'CEP inválido' }),
}).label('Endereço de entrega');

// Telefone/WhatsApp: aceita com ou sem máscara e guarda só os números (DDD + número)
const phone = Joi.string()
  .trim()
  .replace(/\D/g, '')
  .pattern(/^\d{10,11}$/)
  .label('Telefone/WhatsApp')
  .messages({ 'string.pattern.base': 'Telefone inválido: informe DDD + número' });

// Itens do pedido: produto do catálogo OU personalizado (preço sempre calculado no servidor)
const quantity = Joi.number().integer().min(1).max(99).required().label('Quantidade');
const orderItems = Joi.array()
  .items(
    Joi.alternatives().try(
      Joi.object({ product: objectId.required(), quantity }),
      Joi.object({
        custom: Joi.object({
          optionId: Joi.string().valid(...OPTION_IDS).required().label('Tipo do personalizado'),
          imageUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).required().label('Imagem'),
          notes: Joi.string().trim().max(120).allow('').label('Observação'),
        }).required(),
        quantity,
      })
    ).messages({ 'alternatives.match': 'Item do carrinho inválido' })
  )
  .min(1)
  .max(50)
  .required();

// Modo manutenção (admin)
const maintenance = Joi.object({
  enabled: Joi.boolean().required(),
  message: Joi.string().trim().max(200).allow('').label('Mensagem'),
});

// Configuração dos personalizados (admin)
const customConfig = Joi.object({
  enabled: Joi.boolean().required(),
  productionDays: Joi.number().integer().min(0).max(60).required().label('Prazo de produção'),
  options: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().valid(...OPTION_IDS).required(),
        label: Joi.string().trim().min(2).max(40).required().label('Nome'),
        detail: Joi.string().trim().max(40).allow('').label('Medida'),
        price: Joi.number().min(0.5).max(10000).precision(2).required().label('Preço'),
        active: Joi.boolean().required(),
      })
    )
    .unique('id')
    .max(OPTION_IDS.length)
    .required(),
}).messages(msgs);

// ---------- Cupons ----------
const couponCode = Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]{3,20}$/).label('Cupom').messages({
  'string.pattern.base': 'O código do cupom deve ter de 3 a 20 letras, números, - ou _',
});

const couponFields = {
  code: couponCode,
  type: Joi.string().valid(...COUPON_TYPES).label('Tipo'),
  value: Joi.when('type', {
    switch: [
      { is: 'percentual', then: Joi.number().min(1).max(100).required() },
      { is: 'valor', then: Joi.number().min(0.01).max(100000).required() },
    ],
    otherwise: Joi.any().strip(),
  }).label('Valor do desconto'),
  minSubtotal: Joi.number().min(0).max(100000).default(0).label('Compra mínima'),
  maxUses: Joi.number().integer().min(0).max(1000000).default(0).label('Limite de usos'),
  onePerCustomer: Joi.boolean().default(false),
  expiresAt: Joi.date().allow(null, '').empty('').label('Validade'),
  active: Joi.boolean().default(true),
  showInBanner: Joi.boolean().default(false),
  bannerText: Joi.string().trim().max(120).allow('').label('Mensagem da faixa'),
};

const coupon = Joi.object({
  ...couponFields,
  code: couponCode.required(),
  type: couponFields.type.required(),
}).messages(msgs);

// Na edição, tipo e valor vão juntos (o valor depende do tipo)
const couponUpdate = Joi.object({
  ...couponFields,
  minSubtotal: Joi.number().min(0).max(100000),
  maxUses: Joi.number().integer().min(0).max(1000000),
  onePerCustomer: Joi.boolean(),
  active: Joi.boolean(),
  showInBanner: Joi.boolean(),
})
  .with('value', 'type')
  .min(1)
  .messages(msgs);

const validateCoupon = Joi.object({
  code: couponCode.required(),
  items: orderItems,
  deliveryMethod: Joi.string().valid(...DELIVERY_METHODS).default('entrega'),
}).messages(msgs);

const createOrder = Joi.object({
  items: orderItems.label('Itens').messages({ 'array.min': 'O carrinho está vazio' }),
  contactPhone: phone.required(),
  couponCode: couponCode.allow(''),
  deliveryMethod: Joi.string().valid(...DELIVERY_METHODS).default('entrega').label('Forma de entrega'),
  // Entrega exige endereço; na retirada o endereço é ignorado
  shippingAddress: Joi.when('deliveryMethod', {
    is: 'entrega',
    then: addressSchema.required(),
    otherwise: Joi.any().strip(),
  }),
}).messages(msgs);

const updateOrderStatus = Joi.object({
  status: Joi.string().valid(...STATUSES).required().label('Status'),
  trackingCode: Joi.string().trim().max(40).allow('').label('Código de rastreio'),
}).messages(msgs);

const payOrder = Joi.object({
  cpf: Joi.string().trim().max(20).label('CPF'),
}).messages(msgs);

module.exports = {
  payOrder,
  register,
  login,
  updateMe,
  adminUpdateUser,
  createProduct,
  updateProduct,
  listProducts,
  createOrder,
  customConfig,
  maintenance,
  forgotPassword,
  resetPassword,
  coupon,
  couponUpdate,
  validateCoupon,
  updateOrderStatus,
};
