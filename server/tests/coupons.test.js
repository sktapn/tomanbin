/**
 * Cupons de desconto: o desconto é sempre calculado no servidor
 * e as regras (validade, limite, compra mínima) não podem ser burladas.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ADMIN_ID = '64b000000000000000000001';
const PRODUCT_ID = '64b0000000000000000000ff';
const userToken = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET);

const ADDRESS = { zip: '69301-150', street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Boa Vista', state: 'RR' };
const order = (extra) =>
  request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ product: PRODUCT_ID, quantity: 2 }], contactPhone: '95991234567', deliveryMethod: 'entrega', shippingAddress: ADDRESS, ...extra });

const coupon = (data) => ({ _id: 'c1', code: 'BEMVINDO10', type: 'percentual', value: 10, minSubtotal: 0, maxUses: 0, uses: 0, active: true, ...data });

let created;
beforeEach(() => {
  created = null;
  jest.spyOn(User, 'findById').mockImplementation(async (id) =>
    String(id) === ADMIN_ID ? { _id: ADMIN_ID, role: 'admin' } : { _id: USER_ID, name: 'Cliente', role: 'user' }
  );
  jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
  jest.spyOn(Order, 'exists').mockResolvedValue(null);
  jest.spyOn(User, 'updateOne').mockResolvedValue({});
  jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({ _id: PRODUCT_ID, name: 'Mago', price: 50, images: [], stock: 8 });
  jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue({ _id: PRODUCT_ID, stock: 10 });
  jest.spyOn(Order, 'create').mockImplementation(async (data) => (created = { _id: 'o1', ...data }));
  jest.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue({ uses: 1 });
});
afterEach(() => jest.restoreAllMocks());

describe('Cupom no pedido', () => {
  it('10% de desconto calculado no servidor (ignora desconto enviado pelo navegador)', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon());
    const res = await order({ couponCode: 'bemvindo10', discount: 999, total: 1 });
    expect(res.status).toBe(201);
    expect(created.subtotal).toBe(100);
    expect(created.discount).toBe(10);
    expect(created.total).toBe(105); // 100 - 10 + 15 de frete
    expect(created.couponCode).toBe('BEMVINDO10');
    expect(Coupon.findOneAndUpdate).toHaveBeenCalled(); // contou um uso
  });

  it('frete grátis zera só o frete', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon({ code: 'FRETEGRATIS', type: 'frete', value: 0 }));
    const res = await order({ couponCode: 'FRETEGRATIS' });
    expect(res.status).toBe(201);
    expect(created.discount).toBe(15);
    expect(created.total).toBe(100);
  });

  it('desconto em reais nunca deixa os produtos negativos', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon({ type: 'valor', value: 500 }));
    const res = await order({ couponCode: 'BEMVINDO10' });
    expect(res.status).toBe(201);
    expect(created.discount).toBe(100);
    expect(created.total).toBe(15); // só o frete
  });

  it.each([
    ['inexistente', null, 'Cupom inválido'],
    ['desativado', coupon({ active: false }), 'Cupom inválido'],
    ['expirado', coupon({ expiresAt: new Date('2020-01-01') }), 'expirou'],
    ['esgotado', coupon({ maxUses: 5, uses: 5 }), 'esgotou'],
    ['abaixo da compra mínima', coupon({ minSubtotal: 200 }), 'a partir de'],
  ])('cupom %s é recusado e o estoque volta', async (_n, found, msg) => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(found);
    const res = await order({ couponCode: 'BEMVINDO10' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(msg);
    expect(Order.create).not.toHaveBeenCalled();
    expect(Product.findByIdAndUpdate).toHaveBeenCalled(); // estoque devolvido
  });

  it('cupom de uso único não pode ser usado duas vezes pelo mesmo cliente', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon({ onePerCustomer: true }));
    Order.exists.mockResolvedValue({ _id: 'antigo' });
    const res = await order({ couponCode: 'BEMVINDO10' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('já usou');
  });

  it('corrida pelo último uso: se esgotar no meio, o pedido é recusado', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon({ maxUses: 1, uses: 0 }));
    Coupon.findOneAndUpdate.mockResolvedValue(null); // outro cliente pegou antes
    const res = await order({ couponCode: 'BEMVINDO10' });
    expect(res.status).toBe(400);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('frete grátis não vale para retirada', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon({ type: 'frete' }));
    const res = await order({ couponCode: 'FRETEGRATIS', deliveryMethod: 'retirada' });
    expect(res.status).toBe(400);
  });
});

describe('Prévia do cupom no carrinho', () => {
  it('calcula o desconto com o preço do banco', async () => {
    jest.spyOn(Coupon, 'findOne').mockResolvedValue(coupon());
    jest.spyOn(Product, 'find').mockReturnValue({ select: async () => [{ _id: PRODUCT_ID, price: 50 }] });
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'bemvindo10', items: [{ product: PRODUCT_ID, quantity: 2, price: 1 }], deliveryMethod: 'retirada' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'BEMVINDO10', discount: 10 });
  });
});

describe('Gerenciar cupons', () => {
  it('cliente comum não cria cupom → 403', async () => {
    const res = await request(app).post('/api/coupons').set('Authorization', `Bearer ${userToken}`).send({ code: 'HACK', type: 'percentual', value: 100 });
    expect(res.status).toBe(403);
  });

  it('admin cria cupom; percentual acima de 100 é recusado', async () => {
    jest.spyOn(Coupon, 'exists').mockResolvedValue(null);
    jest.spyOn(Coupon, 'create').mockImplementation(async (d) => ({ _id: 'c9', ...d }));
    const bad = await request(app).post('/api/coupons').set('Authorization', `Bearer ${adminToken}`).send({ code: 'MEGA', type: 'percentual', value: 150 });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/coupons').set('Authorization', `Bearer ${adminToken}`).send({ code: 'natal15', type: 'percentual', value: 15, uses: 999 });
    expect(ok.status).toBe(201);
    expect(ok.body.code).toBe('NATAL15');
    expect(ok.body.uses).toBeUndefined(); // contador não pode ser forjado
  });
});

describe('Faixa da loja', () => {
  it('mostra o cupom em destaque com mensagem automática', async () => {
    jest.spyOn(Coupon, 'findOne').mockReturnValue({ sort: async () => coupon({ showInBanner: true }) });
    const res = await request(app).get('/api/coupons/banner');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'BEMVINDO10', message: 'Use o cupom BEMVINDO10 e ganhe 10% de desconto' });
  });

  it('sem cupom ativo em destaque, a faixa some', async () => {
    jest.spyOn(Coupon, 'findOne').mockReturnValue({ sort: async () => null });
    const res = await request(app).get('/api/coupons/banner');
    expect(res.body).toBeNull();
  });
});
