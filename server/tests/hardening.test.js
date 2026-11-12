/** Correções da avaliação antes de colocar no ar */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const orders = require('../src/controllers/orderController');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ADMIN_ID = '64b000000000000000000001';
const ORDER_ID = '64b0000000000000000000aa';
const userToken = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET);

beforeEach(() => {
  jest.spyOn(User, 'findById').mockImplementation(async (id) =>
    String(id) === ADMIN_ID ? { _id: ADMIN_ID, role: 'admin' } : { _id: USER_ID, name: 'Cliente', role: 'user' }
  );
});
afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.PAYMENT_PROVIDER;
  process.env.NODE_ENV = 'test';
});

describe('Cancelamento pelo cliente', () => {
  it('pedido que acabou de ser pago NÃO é cancelado (corrida com o Pix)', async () => {
    jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null); // não está mais pendente
    jest.spyOn(Order, 'exists').mockResolvedValue({ _id: ORDER_ID });
    const restore = jest.spyOn(Product, 'findByIdAndUpdate');
    const res = await request(app).patch(`/api/orders/${ORDER_ID}/cancel`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(restore).not.toHaveBeenCalled(); // estoque não volta em dobro
    expect(Order.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ status: 'pendente', user: USER_ID });
  });
});

describe('Admin exclui um cliente', () => {
  it('pedidos não pagos são cancelados com estoque e cupom devolvidos (não somem)', async () => {
    jest.spyOn(User, 'findByIdAndDelete').mockResolvedValue({ _id: USER_ID });
    jest.spyOn(Order, 'find').mockResolvedValue([{ _id: ORDER_ID, couponCode: 'BEMVINDO10', items: [{ product: 'p1', quantity: 2 }] }]);
    jest.spyOn(Order, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const stock = jest.spyOn(Product, 'updateOne').mockResolvedValue({});
    const coupon = jest.spyOn(Coupon, 'updateOne').mockResolvedValue({});
    const del = jest.spyOn(Order, 'deleteMany');

    const res = await request(app).delete(`/api/users/${USER_ID}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    expect(stock).toHaveBeenCalledWith({ _id: 'p1' }, { $inc: { stock: 2 } });
    expect(coupon).toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

describe('Pagamento de demonstração', () => {
  it('é bloqueado com o site no ar (produção)', () => {
    process.env.PAYMENT_PROVIDER = 'demo';
    process.env.NODE_ENV = 'production';
    expect(orders.paymentTestMode()).toBe(false); // nem chega a gerar Pix "pagável" com um clique
  });

  it('o site avisa quando os pagamentos são de teste', async () => {
    process.env.PAYMENT_PROVIDER = 'demo';
    const res = await request(app).get('/api/store');
    expect(res.body.paymentTestMode).toBe(true);
  });
});

describe('Troca de senha no perfil', () => {
  it('devolve um token novo e marca a data da troca (derruba outros aparelhos)', async () => {
    const user = {
      _id: USER_ID, role: 'user', name: 'Cliente',
      comparePassword: async () => true,
      save: jest.fn(async () => {}),
      toJSON() { return { _id: USER_ID, name: 'Cliente' }; },
    };
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const p = Promise.resolve({ _id: USER_ID, role: 'user' });
      p.select = async () => user;
      return p;
    });
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: 'novaSenha123', currentPassword: 'antiga123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
  });
});

describe('Validação', () => {
  it('produto com preço zero é recusado', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Grátis', price: 0, category: 'buttons' });
    expect(res.status).toBe(400);
  });
});

describe('Dashboard', () => {
  it('vendas contam só pedidos pagos e os dias seguem o fuso de Boa Vista', async () => {
    const agg = jest.spyOn(Order, 'aggregate').mockResolvedValue([]);
    jest.spyOn(User, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Product, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Product, 'find').mockReturnValue({ select: () => ({ sort: () => ({ limit: async () => [] }) }) });
    const res = await request(app).get('/api/orders/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(agg.mock.calls[0][0][0].$match.status).toEqual({ $in: ['pago', 'enviado', 'entregue'] });
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Boa_Vista' }).format(new Date());
    expect(res.body.last7Days).toHaveLength(7);
    expect(res.body.last7Days[6].date).toBe(today);
  });
});

describe('Imagens no site publicado', () => {
  afterEach(() => delete process.env.API_PUBLIC_URL);

  it('endereço localhost vira o endereço público da API', () => {
    process.env.API_PUBLIC_URL = 'https://tomanbin-api.onrender.com';
    const p = new Product({ name: 'X', price: 5, category: 'buttons', images: ['http://localhost:5001/static/products/a.svg', 'https://res.cloudinary.com/x/a.jpg'] });
    expect(p.toJSON().images).toEqual(['https://tomanbin-api.onrender.com/static/products/a.svg', 'https://res.cloudinary.com/x/a.jpg']);
    const o = new Order({ items: [{ name: 'X', price: 5, quantity: 1, image: 'http://localhost:5001/static/products/a.svg' }] });
    expect(o.toJSON().items[0].image).toBe('https://tomanbin-api.onrender.com/static/products/a.svg');
  });

  it('sem API_PUBLIC_URL (no computador) continua igual', () => {
    const p = new Product({ name: 'X', price: 5, category: 'buttons', images: ['http://localhost:5001/static/products/a.svg'] });
    expect(p.toJSON().images[0]).toBe('http://localhost:5001/static/products/a.svg');
  });
});
