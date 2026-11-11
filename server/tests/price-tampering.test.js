/**
 * Ataque: cliente mexe no navegador e manda preço/total falsos (ex: R$ 1,00).
 * O servidor deve ignorar e calcular tudo com o preço do BANCO.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const PRODUCT_ID = '64b0000000000000000000ff';
const token = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
const post = (body) => request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send(body);

let created;
beforeEach(() => {
  created = null;
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: USER_ID, name: 'Cliente', role: 'user' });
  jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
  // Produto no banco custa R$ 59,90
  jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({ _id: PRODUCT_ID, name: 'Mago Chibi', price: 59.9, images: [], stock: 8 });
  jest.spyOn(Order, 'create').mockImplementation(async (data) => (created = { _id: 'o1', ...data }));
});
afterEach(() => jest.restoreAllMocks());

describe('Manipulação de preço pelo navegador', () => {
  it('preço, total e frete falsos são ignorados: vale o preço do banco', async () => {
    const res = await post({
      items: [{ product: PRODUCT_ID, quantity: 2, price: 1 }], // tenta pagar R$ 1 cada
      total: 1,
      subtotal: 1,
      shippingFee: 0,
      deliveryMethod: 'entrega',
      shippingAddress: { zip: '69301-150', street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Boa Vista', state: 'RR' },
    });
    expect(res.status).toBe(201);
    expect(created.items[0].price).toBe(59.9);
    expect(created.subtotal).toBe(119.8); // 2 × 59,90
    expect(created.shippingFee).toBe(15); // frete do servidor
    expect(created.total).toBe(134.8);
  });

  it('quantidade negativa ou zero é recusada → 400', async () => {
    for (const quantity of [-5, 0, 1.5]) {
      const res = await post({ items: [{ product: PRODUCT_ID, quantity }], deliveryMethod: 'retirada' });
      expect(res.status).toBe(400);
    }
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('não dá para comprar mais do que o estoque', async () => {
    Product.findOneAndUpdate.mockResolvedValue(null); // estoque insuficiente
    jest.spyOn(Product, 'findById').mockResolvedValue({ name: 'Mago Chibi', active: true, stock: 1 });
    const res = await post({ items: [{ product: PRODUCT_ID, quantity: 5 }], deliveryMethod: 'retirada' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Estoque insuficiente/);
  });
});
