/**
 * Confirmação de pagamento confiável:
 *  - webhook do Mercado Pago (com assinatura) marca o pedido como pago
 *  - a limpeza automática NUNCA cancela um pedido que foi pago
 *  - a conferência periódica pega pagamentos mesmo sem webhook
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-teste';

const crypto = require('crypto');
const request = require('supertest');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const mercadopago = require('../src/services/mercadopago');
const orders = require('../src/controllers/orderController');
const app = require('../src/app');

const SECRET = 'segredo-webhook';
const PIX_ID = 'ORD01TESTEPIX';

function makeOrder(createdAt = new Date()) {
  const o = new Order({
    user: '64b000000000000000000002',
    items: [{ product: '64b0000000000000000000ff', name: 'X', price: 10, quantity: 2 }],
    deliveryMethod: 'retirada',
    total: 20,
    status: 'pendente',
    createdAt,
    payment: { provider: 'mercadopago', pixId: PIX_ID, status: 'PENDING', expiresAt: new Date(Date.now() + 3600_000) },
  });
  o.save = jest.fn(async () => o);
  return o;
}

function sign(dataId, requestId, ts = '1704908010') {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

beforeEach(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
  jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(null);
});
afterEach(() => jest.restoreAllMocks());

describe('Webhook do Mercado Pago', () => {
  it('assinatura válida → consulta a API e marca o pedido como pago', async () => {
    const order = makeOrder();
    jest.spyOn(Order, 'findOne').mockResolvedValue(order);
    const check = jest.spyOn(mercadopago, 'checkPix').mockResolvedValue({ status: 'PAID' });

    const res = await request(app)
      .post(`/api/webhooks/mercadopago?data.id=${PIX_ID}&type=order`)
      .set('x-request-id', 'req-123')
      .set('x-signature', sign(PIX_ID, 'req-123'))
      .send({ type: 'order', data: { id: PIX_ID } });

    expect(res.status).toBe(200);
    expect(check).toHaveBeenCalledWith(PIX_ID); // status lido da API, não do aviso
    expect(order.status).toBe('pago');
  });

  it('assinatura falsa → 401 e nada muda', async () => {
    const order = makeOrder();
    jest.spyOn(Order, 'findOne').mockResolvedValue(order);
    const check = jest.spyOn(mercadopago, 'checkPix');

    const res = await request(app)
      .post(`/api/webhooks/mercadopago?data.id=${PIX_ID}`)
      .set('x-request-id', 'req-123')
      .set('x-signature', 'ts=1704908010,v1=assinatura-falsa')
      .send({});

    expect(res.status).toBe(401);
    expect(check).not.toHaveBeenCalled();
    expect(order.status).toBe('pendente');
  });
});

describe('Limpeza de pedidos não pagos', () => {
  const old = () => new Date(Date.now() - 48 * 3600_000);

  it('NÃO cancela um pedido que foi pago (confere o gateway antes)', async () => {
    const order = makeOrder(old());
    jest.spyOn(Order, 'find').mockResolvedValue([order]);
    jest.spyOn(mercadopago, 'checkPix').mockResolvedValue({ status: 'PAID' });
    const cancel = jest.spyOn(Order, 'updateOne');

    const canceled = await orders.expireStalePendingOrders();

    expect(canceled).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
    expect(order.status).toBe('pago');
  });

  it('se o gateway não responder, não cancela (tenta de novo depois)', async () => {
    const order = makeOrder(old());
    jest.spyOn(Order, 'find').mockResolvedValue([order]);
    jest.spyOn(mercadopago, 'checkPix').mockRejectedValue(new Error('timeout'));
    const cancel = jest.spyOn(Order, 'updateOne');
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(await orders.expireStalePendingOrders()).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('pedido realmente não pago é cancelado e o estoque volta', async () => {
    const order = makeOrder(old());
    jest.spyOn(Order, 'find').mockResolvedValue([order]);
    jest.spyOn(mercadopago, 'checkPix').mockResolvedValue({ status: 'PENDING' });
    jest.spyOn(Order, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

    expect(await orders.expireStalePendingOrders()).toBe(1);
    expect(Product.findByIdAndUpdate).toHaveBeenCalled(); // estoque devolvido
  });
});

describe('Conferência periódica (sem webhook)', () => {
  it('encontra o pagamento e marca o pedido como pago', async () => {
    const order = makeOrder();
    jest.spyOn(Order, 'find').mockReturnValue({ sort: () => ({ limit: async () => [order] }) });
    jest.spyOn(mercadopago, 'checkPix').mockResolvedValue({ status: 'PAID' });

    expect(await orders.reconcilePendingPayments()).toBe(1);
    expect(order.status).toBe('pago');
  });
});
