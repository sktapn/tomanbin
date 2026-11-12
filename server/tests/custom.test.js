/** Personalizados ("Faça o seu"): preço do servidor e só com a imagem do próprio cliente */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Setting = require('../src/models/Setting');
const CustomArt = require('../src/models/CustomArt');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ADMIN_ID = '64b000000000000000000001';
const PRODUCT_ID = '64b0000000000000000000ff';
const ART = 'https://res.cloudinary.com/demo/image/upload/v1/tomanbin/personalizados/arte.png';
const userToken = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

const savedConfig = (value) => jest.spyOn(Setting, 'findOne').mockReturnValue({ lean: async () => (value ? { value } : null) });

let created;
beforeEach(() => {
  created = null;
  jest.spyOn(User, 'findById').mockImplementation(async (id) =>
    String(id) === ADMIN_ID ? { _id: ADMIN_ID, role: 'admin' } : { _id: USER_ID, name: 'Cliente', role: 'user' }
  );
  jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
  jest.spyOn(User, 'updateOne').mockResolvedValue({});
  jest.spyOn(Order, 'create').mockImplementation(async (d) => (created = { _id: 'o1', ...d }));
  savedConfig(null); // usa os preços padrão
});
afterEach(() => jest.restoreAllMocks());

const order = (items) =>
  request(app).post('/api/orders').set('Authorization', `Bearer ${userToken}`)
    .send({ items, contactPhone: '95991234567', deliveryMethod: 'retirada' });

describe('Pedido com personalizado', () => {
  it('preço vem da loja (ignora preço enviado) e junta com produto do catálogo', async () => {
    jest.spyOn(CustomArt, 'exists').mockResolvedValue({ _id: 'a1' });
    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({ _id: PRODUCT_ID, name: 'Mago', price: 50, images: [], stock: 5 });
    const res = await order([
      { custom: { optionId: 'button-m', imageUrl: ART, notes: 'Nome: Ana' }, quantity: 3, price: 0.01 },
      { product: PRODUCT_ID, quantity: 1 },
    ]);
    expect(res.status).toBe(201);
    const item = created.items.find((i) => i.custom);
    expect(item).toMatchObject({ name: 'Button M personalizado (3,8 cm)', price: 8, quantity: 3 });
    expect(item.custom).toEqual({ optionId: 'button-m', imageUrl: ART, notes: 'Nome: Ana' });
    expect(created.subtotal).toBe(74); // 3×8 + 50
  });

  it('imagem que não foi enviada por este cliente é recusada', async () => {
    jest.spyOn(CustomArt, 'exists').mockResolvedValue(null);
    const res = await order([{ custom: { optionId: 'chaveiro', imageUrl: 'https://site-qualquer.com/x.png' }, quantity: 1 }]);
    expect(res.status).toBe(400);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('opção desativada pelo admin é recusada', async () => {
    savedConfig({ options: [{ id: 'button-g', active: false }] });
    jest.spyOn(CustomArt, 'exists').mockResolvedValue({ _id: 'a1' });
    const res = await order([{ custom: { optionId: 'button-g', imageUrl: ART }, quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  it('tipo inexistente é barrado na validação', async () => {
    const res = await order([{ custom: { optionId: 'camiseta', imageUrl: ART }, quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  it('preço editado pelo admin passa a valer', async () => {
    savedConfig({ options: [{ id: 'chaveiro', price: 22.5 }] });
    jest.spyOn(CustomArt, 'exists').mockResolvedValue({ _id: 'a1' });
    const res = await order([{ custom: { optionId: 'chaveiro', imageUrl: ART }, quantity: 2 }]);
    expect(res.status).toBe(201);
    expect(created.subtotal).toBe(45);
  });

  it('cancelar pedido com personalizado não mexe em estoque', async () => {
    jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue({ _id: 'o1', items: [{ custom: { optionId: 'button-p' }, quantity: 2 }] });
    const stock = jest.spyOn(Product, 'findByIdAndUpdate');
    const res = await request(app).patch('/api/orders/64b0000000000000000000aa/cancel').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(stock).not.toHaveBeenCalled();
  });
});

describe('Envio da imagem do cliente', () => {
  it('exige login', async () => {
    const res = await request(app).post('/api/custom/art').attach('image', PNG, 'a.png');
    expect(res.status).toBe(401);
  });

  it('arquivo que não é imagem é recusado', async () => {
    const res = await request(app).post('/api/custom/art').set('Authorization', `Bearer ${userToken}`)
      .attach('image', Buffer.from('<svg onload=alert(1)>'), 'x.png');
    expect(res.status).toBe(400);
  });

  it('imagem válida fica registrada como do cliente', async () => {
    const storage = require('../src/services/imageStorage');
    jest.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();
    jest.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue();
    const reg = jest.spyOn(CustomArt, 'create').mockResolvedValue({});
    const res = await request(app).post('/api/custom/art').set('Authorization', `Bearer ${userToken}`).attach('image', PNG, 'a.png');
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/static\/uploads\/arte-/);
    expect(reg).toHaveBeenCalledWith({ user: USER_ID, url: res.body.url });
    expect(storage).toBeTruthy();
  });
});

describe('Configuração (admin)', () => {
  const body = {
    enabled: true,
    productionDays: 4,
    options: [{ id: 'button-p', label: 'Button P', detail: '2,5 cm', price: 7, active: true }],
  };

  it('cliente não altera preços', async () => {
    const res = await request(app).put('/api/custom').set('Authorization', `Bearer ${userToken}`).send(body);
    expect(res.status).toBe(403);
  });

  it('preço zero é recusado', async () => {
    const res = await request(app).put('/api/custom').set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body, options: [{ ...body.options[0], price: 0 }] });
    expect(res.status).toBe(400);
  });

  it('público só vê opções ativas', async () => {
    savedConfig({ options: [{ id: 'chaveiro', active: false }] });
    const res = await request(app).get('/api/custom');
    expect(res.body.options.map((o) => o.id)).toEqual(['button-p', 'button-m', 'button-g']);
  });
});
