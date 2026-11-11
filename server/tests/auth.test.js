/**
 * Testes das rotas críticas de segurança.
 * Não precisam de MongoDB: testam validação (Joi), AuthN (JWT) e AuthZ (papéis),
 * que acontecem ANTES de qualquer acesso ao banco. O User.findById é "mockado".
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const app = require('../src/app');

const makeToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET);
const ADMIN_ID = '64b000000000000000000001';
const USER_ID = '64b000000000000000000002';

beforeEach(() => {
  jest.spyOn(User, 'findById').mockImplementation(async (id) => {
    if (id === ADMIN_ID) return { _id: ADMIN_ID, name: 'Admin', role: 'admin' };
    if (id === USER_ID) return { _id: USER_ID, name: 'Cliente', role: 'user' };
    return null;
  });
});
afterEach(() => jest.restoreAllMocks());

describe('POST /api/auth/register — validação de entrada', () => {
  it('recusa e-mail inválido com 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'nao-e-email', password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/e-mail inválido/i);
  });

  it('recusa senha curta com 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@x.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });

  it('recusa corpo vazio listando todos os campos', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('Proteção de rotas (AuthN / AuthZ)', () => {
  it('sem token → 401', async () => {
    const res = await request(app).get('/api/orders/stats');
    expect(res.status).toBe(401);
  });

  it('token inválido → 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('usuário comum não pode deletar produto → 403', async () => {
    const res = await request(app)
      .delete('/api/products/64b0000000000000000000ff')
      .set('Authorization', `Bearer ${makeToken(USER_ID, 'user')}`);
    expect(res.status).toBe(403);
  });

  it('usuário comum não pode ver lista de usuários → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(USER_ID, 'user')}`);
    expect(res.status).toBe(403);
  });

  it('admin passa da autorização e cai na validação → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${makeToken(ADMIN_ID, 'admin')}`)
      .send({ name: 'Sem preço', category: 'buttons' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/preço/i);
  });

  it('GET /api/auth/me com token válido devolve o usuário', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(USER_ID, 'user')}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
  });
});

describe('Hash de senha (bcrypt)', () => {
  it('o hook pre-save transforma a senha em hash', async () => {
    const u = new User({ name: 'Teste', email: 't@t.com', password: 'minhasenha' });
    // executa os middlewares "pre save" sem tocar no banco
    await new Promise((resolve, reject) =>
      User.schema.s.hooks.execPre('save', u, [], (err) => (err ? reject(err) : resolve()))
    );
    expect(u.password).not.toBe('minhasenha');
    expect(await bcrypt.compare('minhasenha', u.password)).toBe(true);
  });
});

describe('Pagamento Pix — proteção', () => {
  it('gerar Pix sem login → 401', async () => {
    const res = await request(app).post('/api/orders/64b0000000000000000000aa/pay');
    expect(res.status).toBe(401);
  });
});

describe('Frete', () => {
  it('GET /api/orders/shipping é público e informa o frete fixo', async () => {
    const res = await request(app).get('/api/orders/shipping');
    expect(res.status).toBe(200);
    expect(res.body.fee).toBe(15);
    expect(typeof res.body.pickupInfo).toBe('string');
  });
});
