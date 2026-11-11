const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { emit } = require('../socket');
const asaas = require('../services/asaas');
const demoPix = require('../services/demoPix');
const mercadopago = require('../services/mercadopago');
const { isValidCpf, onlyDigits } = require('../utils/cpf');
const { shippingConfig } = require('../config/shipping');

async function restoreStock(items) {
  for (const it of items) {
    const p = await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } }, { new: true });
    if (p) emit(null, 'stock:update', { productId: p._id, stock: p.stock });
  }
}

// GET /api/orders/shipping  (público) — opções de entrega e valor do frete
exports.shippingOptions = (_req, res) => res.json(shippingConfig());

// POST /api/orders  (logado) — preço e estoque SEMPRE vêm do banco, nunca do front
exports.create = asyncHandler(async (req, res) => {
  const { items, shippingAddress, deliveryMethod } = req.body;

  // Evita que alguém "segure" todo o estoque criando vários pedidos sem pagar
  const MAX_PENDING = Number(process.env.MAX_PENDING_ORDERS || 3);
  const pending = await Order.countDocuments({ user: req.user._id, status: 'pendente' });
  if (pending >= MAX_PENDING) {
    throw new AppError(`Você já tem ${pending} pedidos aguardando pagamento. Pague ou cancele um deles em "Meus pedidos".`, 429);
  }

  // Junta itens repetidos do mesmo produto
  const merged = new Map();
  for (const it of items) merged.set(it.product, (merged.get(it.product) || 0) + it.quantity);

  const reserved = [];
  try {
    for (const [productId, quantity] of merged) {
      // Baixa atômica: só decrementa se houver estoque suficiente
      const product = await Product.findOneAndUpdate(
        { _id: productId, active: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) {
        const exists = await Product.findById(productId);
        if (!exists || !exists.active) throw new AppError('Um dos produtos não está mais disponível', 400);
        throw new AppError(`Estoque insuficiente para "${exists.name}" (restam ${exists.stock})`, 400);
      }
      reserved.push({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity,
        stock: product.stock,
      });
    }
  } catch (err) {
    await restoreStock(reserved); // desfaz o que já foi reservado
    throw err;
  }

  const round = (n) => Math.round(n * 100) / 100;
  const subtotal = round(reserved.reduce((s, it) => s + it.price * it.quantity, 0));
  const shippingFee = deliveryMethod === 'entrega' ? shippingConfig().fee : 0; // frete definido no servidor
  const total = round(subtotal + shippingFee);
  const order = await Order.create({
    user: req.user._id,
    items: reserved.map(({ stock, ...it }) => it),
    subtotal,
    deliveryMethod,
    shippingFee,
    total,
    ...(deliveryMethod === 'entrega' && { shippingAddress }),
  });

  reserved.forEach((it) => emit(null, 'stock:update', { productId: it.product, stock: it.stock }));
  emit('admins', 'order:new', { id: order._id, total, customer: req.user.name, createdAt: order.createdAt });

  res.status(201).json(order);
});

// GET /api/orders/mine  (logado)
exports.mine = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// GET /api/orders/:id  (dono ou admin)
exports.getById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new AppError('Pedido não encontrado', 404);
  const isOwner = String(order.user._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new AppError('Acesso negado', 403);
  res.json(order);
});

// PATCH /api/orders/:id/cancel  (dono, só se pendente)
exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Pedido não encontrado', 404);
  if (order.status !== 'pendente') throw new AppError('Só é possível cancelar pedidos pendentes', 400);
  order.status = 'cancelado';
  await order.save();
  await restoreStock(order.items);
  res.json(order);
});

// GET /api/orders  (admin)
exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  res.json(orders);
});

// PATCH /api/orders/:id/status  (admin)
exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Pedido não encontrado', 404);
  if (order.status === 'cancelado') throw new AppError('Pedido cancelado não pode ser alterado', 400);

  const { status } = req.body;
  order.status = status;
  await order.save();
  if (status === 'cancelado') await restoreStock(order.items);

  emit(`user:${order.user}`, 'order:status', { id: order._id, status });
  await order.populate('user', 'name email');
  res.json(order);
});

// DELETE /api/orders/:id  (admin)
exports.remove = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw new AppError('Pedido não encontrado', 404);
  if (order.status === 'pendente') await restoreStock(order.items);
  res.status(204).end();
});

// GET /api/orders/stats  (admin) — dados do dashboard
exports.stats = asyncHandler(async (_req, res) => {
  const valid = { status: { $ne: 'cancelado' } };
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const [sales, byStatus, topProducts, daily, users, products, lowStock] = await Promise.all([
    Order.aggregate([{ $match: valid }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: valid },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, qty: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { ...valid, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
    ]),
    User.countDocuments(),
    Product.countDocuments(),
    Product.find({ stock: { $lte: 3 } }).select('name stock').sort({ stock: 1 }).limit(5),
  ]);

  // Preenche os 7 dias (mesmo os sem vendas)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, total: daily.find((x) => x._id === key)?.total || 0 });
  }

  res.json({
    totalSales: sales[0]?.total || 0,
    totalOrders: sales[0]?.count || 0,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    topProducts,
    last7Days: days,
    totalUsers: users,
    totalProducts: products,
    lowStock,
  });
});

// ======================= Pagamento Pix (Asaas ou demonstração) =======================

/** Gateway usado: Mercado Pago ou Asaas (se houver chave); senão 'demo'. Pode forçar com PAYMENT_PROVIDER. */
function paymentProvider() {
  const forced = process.env.PAYMENT_PROVIDER;
  if (['demo', 'asaas', 'mercadopago'].includes(forced)) return forced;
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return 'mercadopago';
  if (process.env.ASAAS_API_KEY) return 'asaas';
  // Em produção, NUNCA cai no modo demonstração sem querer (senão qualquer um "pagaria" simulando)
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Pagamento indisponível: configure o gateway de pagamento', 503);
  }
  return 'demo';
}

async function loadOrderFor(req) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Pedido não encontrado', 404);
  const isOwner = String(order.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new AppError('Acesso negado', 403);
  return order;
}

function paymentView(order) {
  const p = order.payment || {};
  return {
    orderId: order._id,
    total: order.total,
    orderStatus: order.status,
    pix: p.pixId
      ? {
          id: p.pixId,
          brCode: p.brCode,
          brCodeBase64: p.brCodeBase64,
          status: p.status,
          devMode: p.devMode,
          provider: p.provider,
          expiresAt: p.expiresAt,
          paidAt: p.paidAt,
        }
      : null,
  };
}

async function applyPixStatus(order, status) {
  order.payment.status = status;
  if (status === 'PAID' && order.status === 'pendente') {
    order.status = 'pago';
    order.payment.paidAt = new Date();
    await order.save();
    emit(`user:${order.user}`, 'order:status', { id: order._id, status: 'pago' });
    emit('admins', 'order:paid', { id: order._id, total: order.total });
    return;
  }
  if (status === 'PAID' && order.status === 'cancelado' && !order.payment.paidAfterCancel) {
    // Pagou depois que o pedido já tinha sido cancelado: o admin precisa decidir (enviar ou estornar)
    order.payment.paidAfterCancel = true;
    order.payment.paidAt = new Date();
    emit('admins', 'order:paid-after-cancel', { id: order._id, total: order.total });
  }
  await order.save();
}

const GATEWAYS = { mercadopago: () => mercadopago, asaas: () => asaas };

/**
 * Consulta o gateway (Mercado Pago/Asaas) e atualiza o pedido se o status mudou.
 * Nunca confia em dados vindos de fora: o status é sempre lido direto da API do gateway.
 */
async function syncPaymentStatus(order) {
  const p = order.payment;
  if (!p?.pixId || p.status !== 'PENDING') return p?.status;
  if (p.provider === 'demo') {
    if (p.expiresAt < new Date()) await applyPixStatus(order, 'EXPIRED');
    return order.payment.status;
  }
  const gateway = GATEWAYS[p.provider]?.();
  if (!gateway) return p.status;
  const data = await gateway.checkPix(p.pixId);
  if (data.status !== p.status) await applyPixStatus(order, data.status);
  return order.payment.status;
}
exports.syncPaymentStatus = syncPaymentStatus;

// POST /api/orders/:id/pay — gera (ou reaproveita) a cobrança Pix do pedido
// body opcional: { cpf } — o Asaas exige CPF do pagador
// Trava por pedido: se chegarem 2 pedidos de Pix ao mesmo tempo (ex: duplo clique ou
// o React rodando o efeito 2x em desenvolvimento), o segundo espera o primeiro e
// reaproveita o Pix gerado, em vez de criar outra cobrança no gateway.
const payLocks = new Map();

exports.pay = asyncHandler(async (req, res) => {
  const key = String(req.params.id);
  while (payLocks.has(key)) {
    await payLocks.get(key).catch(() => {});
  }
  const job = generatePix(req);
  payLocks.set(key, job);
  try {
    res.json(await job);
  } finally {
    payLocks.delete(key);
  }
});

async function generatePix(req) {
  const order = await loadOrderFor(req);
  if (order.status !== 'pendente') {
    throw new AppError(order.status === 'cancelado' ? 'Este pedido foi cancelado' : 'Este pedido já foi pago', 400);
  }

  const p = order.payment;
  const stillValid = p?.pixId && p.status === 'PENDING' && p.expiresAt && p.expiresAt > new Date(Date.now() + 60_000);
  if (!stillValid) {
    const provider = paymentProvider();
    const description = `Pedido Tomanbin #${String(order._id).slice(-6).toUpperCase()}`;
    let pix;

    if (provider === 'demo') {
      // Modo demonstração: não chama nenhum gateway
      pix = await demoPix.createPix({ value: order.total, externalReference: String(order._id) });
    } else if (provider === 'mercadopago') {
      // Mercado Pago: Pix sem precisar de CPF
      const buyer = await User.findById(order.user);
      pix = await mercadopago.createPix({
        value: order.total,
        payerEmail: buyer.email,
        payerName: buyer.name.split(' ')[0],
        externalReference: String(order._id),
        // Mesma chave = mesma cobrança: o Mercado Pago não duplica se a requisição repetir
        idempotencyKey: `tomanbin-${order._id}-${(order.payment?.attempts || 0) + 1}`,
      });
    } else {
      const buyer = await User.findById(order.user);
      const cpf = req.body?.cpf ? onlyDigits(req.body.cpf) : buyer.cpf;
      if (!cpf) throw new AppError('Informe seu CPF para gerar o Pix', 400, { code: 'CPF_REQUIRED' });
      if (!isValidCpf(cpf)) throw new AppError('CPF inválido', 400, { code: 'CPF_REQUIRED' });

      buyer.asaasCustomerId = await asaas.ensureCustomer({
        customerId: buyer.asaasCustomerId,
        cpfChanged: buyer.cpf !== cpf,
        name: buyer.name,
        email: buyer.email,
        cpf,
        externalReference: String(buyer._id),
      });
      buyer.cpf = cpf;
      await buyer.save();

      pix = await asaas.createPix({
        customerId: buyer.asaasCustomerId,
        value: order.total,
        description,
        externalReference: String(order._id),
      });
    }

    order.payment = {
      attempts: (order.payment?.attempts || 0) + 1,
      provider,
      pixId: pix.id,
      brCode: pix.brCode,
      brCodeBase64: pix.brCodeBase64,
      status: pix.status,
      devMode: pix.devMode,
      expiresAt: pix.expiresAt || new Date(Date.now() + 24 * 3600_000),
    };
    await order.save();
  }
  return paymentView(order);
}

// GET /api/orders/:id/payment — consulta o status no gateway e atualiza o pedido
exports.paymentStatus = asyncHandler(async (req, res) => {
  const order = await loadOrderFor(req);
  if (!order.payment?.pixId) throw new AppError('Este pedido ainda não tem Pix gerado', 404);
  await syncPaymentStatus(order);
  res.json(paymentView(order));
});

// POST /api/orders/:id/payment/simulate — Sandbox do Asaas ou modo demonstração
exports.simulatePayment = asyncHandler(async (req, res) => {
  const order = await loadOrderFor(req);
  if (!order.payment?.pixId) throw new AppError('Gere o Pix antes de simular', 400);
  if (!order.payment.devMode) throw new AppError('Simulação só é permitida no modo de teste', 403);
  if (order.payment.status === 'PENDING') {
    if (order.payment.provider === 'demo') {
      await applyPixStatus(order, 'PAID');
    } else if (order.payment.provider === 'mercadopago') {
      // No teste o Mercado Pago aprova sozinho em alguns segundos: aqui só conferimos
      const data = await mercadopago.checkPix(order.payment.pixId);
      if (data.status !== 'PENDING') await applyPixStatus(order, data.status);
    } else {
      await asaas.simulatePix(order.payment.pixId);
      const data = await asaas.checkPix(order.payment.pixId);
      await applyPixStatus(order, data.status === 'PENDING' ? 'PAID' : data.status);
    }
  }
  res.json(paymentView(order));
});

// ======================= Limpeza automática =======================
/**
 * Cancela pedidos pendentes (não pagos) mais antigos que PENDING_ORDER_TTL_HOURS
 * e devolve o estoque. Chamado periodicamente pelo server.js.
 */
exports.expireStalePendingOrders = async () => {
  const hours = Number(process.env.PENDING_ORDER_TTL_HOURS || 24);
  const limit = new Date(Date.now() - hours * 3600_000);
  const stale = await Order.find({ status: 'pendente', createdAt: { $lt: limit } });
  let canceled = 0;
  for (const order of stale) {
    // Antes de cancelar, confere no gateway: se o cliente pagou, o pedido vira "pago"
    try {
      const status = await syncPaymentStatus(order);
      if (status === 'PAID') continue;
    } catch (err) {
      // Sem resposta do gateway: não cancela agora, tenta de novo na próxima rodada
      console.error(`Conferência do pedido ${order._id}:`, err.message);
      continue;
    }
    // update atômico: só cancela se ainda estiver pendente (evita corrida com o pagamento)
    const res = await Order.updateOne({ _id: order._id, status: 'pendente' }, { status: 'cancelado' });
    if (res.modifiedCount) {
      canceled++;
      await restoreStock(order.items);
      emit(`user:${order.user}`, 'order:status', { id: order._id, status: 'cancelado' });
    }
  }
  return canceled;
};

/**
 * Rede de segurança caso o aviso (webhook) do gateway não chegue:
 * confere de tempos em tempos os pedidos com Pix pendente.
 */
exports.reconcilePendingPayments = async () => {
  const pending = await Order.find({
    status: 'pendente',
    'payment.status': 'PENDING',
    'payment.provider': { $in: Object.keys(GATEWAYS) },
  })
    .sort({ createdAt: -1 })
    .limit(50);
  let paid = 0;
  for (const order of pending) {
    try {
      if ((await syncPaymentStatus(order)) === 'PAID') paid++;
    } catch (err) {
      console.error(`Conferência do pedido ${order._id}:`, err.message);
    }
  }
  return paid;
};

/** Usado pelo webhook: encontra o pedido pela cobrança do gateway e sincroniza */
exports.syncByPixId = async (provider, pixId) => {
  const order = await Order.findOne({ 'payment.provider': provider, 'payment.pixId': pixId });
  if (!order) return null;
  await syncPaymentStatus(order);
  return order;
};
