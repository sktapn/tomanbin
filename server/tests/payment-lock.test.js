/**
 * Garante que dois pedidos de Pix simultâneos para o MESMO pedido geram UMA cobrança só.
 * (Antes, o React em desenvolvimento chamava 2x e o Mercado Pago registrava 2 cobranças.)
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.PAYMENT_PROVIDER = 'mercadopago';
process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-teste';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const mercadopago = require('../src/services/mercadopago');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ORDER_ID = '64b0000000000000000000aa';
const token = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);

let order;
beforeEach(() => {
  order = new Order({
    _id: ORDER_ID,
    user: USER_ID,
    items: [{ product: '64b0000000000000000000ff', name: 'X', price: 10, quantity: 1 }],
    deliveryMethod: 'retirada',
    total: 10,
  });
  order.save = jest.fn(async () => order);
  jest.spyOn(Order, 'findById').mockImplementation(async () => order);
  jest.spyOn(User, 'findById').mockImplementation(async () => ({ _id: USER_ID, name: 'Ana Souza', email: 'ana@x.com', role: 'user' }));
  jest.spyOn(mercadopago, 'createPix').mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 50)); // simula a demora da API
    return { id: 'ORD1', status: 'PENDING', brCode: '000201', brCodeBase64: 'x', devMode: true, expiresAt: new Date(Date.now() + 3600_000) };
  });
});
afterEach(() => jest.restoreAllMocks());

it('duas chamadas ao mesmo tempo → uma cobrança só', async () => {
  const call = () => request(app).post(`/api/orders/${ORDER_ID}/pay`).set('Authorization', `Bearer ${token}`).send({});
  const [a, b] = await Promise.all([call(), call()]);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  expect(mercadopago.createPix).toHaveBeenCalledTimes(1);
  expect(a.body.pix.id).toBe('ORD1');
  expect(b.body.pix.id).toBe('ORD1');
  // chave de idempotência fixa por pedido + tentativa
  expect(mercadopago.createPix.mock.calls[0][0].idempotencyKey).toBe(`tomanbin-${ORDER_ID}-1`);
});
