/** Modo manutenção: cliente não compra nem se cadastra; o admin continua usando tudo */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Setting = require('../src/models/Setting');
const maintenance = require('../src/services/maintenance');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ADMIN_ID = '64b000000000000000000001';
const userToken = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET);

const saved = (value) => jest.spyOn(Setting, 'findOne').mockReturnValue({ lean: async () => (value ? { value } : null) });

beforeEach(() => {
  jest.spyOn(maintenance, 'dbReady').mockReturnValue(true);
  jest.spyOn(User, 'findById').mockImplementation(async (id) =>
    String(id) === ADMIN_ID ? { _id: ADMIN_ID, role: 'admin' } : { _id: USER_ID, name: 'Cliente', role: 'user' }
  );
});
afterEach(() => jest.restoreAllMocks());

const novoPedido = (token) =>
  request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
    .send({ items: [{ product: '64b0000000000000000000ff', quantity: 1 }], contactPhone: '95991234567', deliveryMethod: 'retirada' });

describe('GET /api/store', () => {
  it('desligado por padrão, com a mensagem padrão', async () => {
    saved(null);
    const res = await request(app).get('/api/store');
    expect(res.status).toBe(200);
    expect(res.body.maintenance).toEqual({ enabled: false, message: maintenance.DEFAULT_MESSAGE });
  });

  it('mostra quando está ligado e a mensagem do admin', async () => {
    saved({ enabled: true, message: 'Volto amanhã às 9h' });
    const res = await request(app).get('/api/store');
    expect(res.body.maintenance).toEqual({ enabled: true, message: 'Volto amanhã às 9h' });
  });

  it('banco com problema não derruba o site', async () => {
    jest.spyOn(Setting, 'findOne').mockReturnValue({ lean: async () => { throw new Error('timeout'); } });
    const res = await request(app).get('/api/store');
    expect(res.status).toBe(200);
    expect(res.body.maintenance.enabled).toBe(false);
  });
});

describe('Com a manutenção ligada', () => {
  beforeEach(() => saved({ enabled: true }));

  it('cliente não consegue fazer pedido', async () => {
    const create = jest.spyOn(Order, 'create');
    const res = await novoPedido(userToken);
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/manutenção/);
    expect(create).not.toHaveBeenCalled();
  });

  it('cliente não consegue gerar o Pix de um pedido antigo', async () => {
    const res = await request(app).post('/api/orders/64b0000000000000000000aa/pay')
      .set('Authorization', `Bearer ${userToken}`).send({ cpf: '52998224725' });
    expect(res.status).toBe(503);
  });

  it('ninguém consegue se cadastrar', async () => {
    const create = jest.spyOn(User, 'create');
    const res = await request(app).post('/api/auth/register').send({ name: 'Nova', email: 'nova@x.com', password: 'senha123' });
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('cliente não consegue enviar arte de personalizado', async () => {
    const res = await request(app).post('/api/custom/art').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
  });

  it('o admin passa (a validação do pedido segue normalmente)', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400); // chegou na validação, não foi barrado pela manutenção
  });

  it('o login continua funcionando (para o admin entrar)', async () => {
    jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
    const res = await request(app).post('/api/auth/login').send({ email: 'alguem@x.com', password: 'errada123' });
    expect(res.status).toBe(401); // chegou no login de verdade
  });
});

describe('PUT /api/store/maintenance', () => {
  it('só o admin liga/desliga', async () => {
    expect((await request(app).put('/api/store/maintenance').send({ enabled: true })).status).toBe(401);
    const res = await request(app).put('/api/store/maintenance').set('Authorization', `Bearer ${userToken}`).send({ enabled: true });
    expect(res.status).toBe(403);
  });

  it('admin liga com mensagem e o valor é salvo', async () => {
    const upd = jest.spyOn(Setting, 'findOneAndUpdate').mockResolvedValue({});
    saved({ enabled: true, message: 'Voltamos amanhã' });
    const res = await request(app).put('/api/store/maintenance').set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true, message: '  Voltamos amanhã  ', extra: 'ignorado' });
    expect(res.status).toBe(200);
    expect(upd).toHaveBeenCalledWith({ key: 'maintenance' }, { value: { enabled: true, message: 'Voltamos amanhã' } }, { upsert: true });
    expect(res.body.maintenance).toEqual({ enabled: true, message: 'Voltamos amanhã' });
  });

  it('recusa mensagem gigante', async () => {
    const res = await request(app).put('/api/store/maintenance').set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true, message: 'x'.repeat(201) });
    expect(res.status).toBe(400);
  });
});
