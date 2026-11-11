/**
 * Testes de segurança: simulam ataques comuns contra a API.
 * Não precisam de MongoDB (os ataques são barrados antes de chegar ao banco).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const schemas = require('../src/validators/schemas');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const ADMIN_ID = '64b000000000000000000001';
const sign = (payload, secret = process.env.JWT_SECRET, opts = {}) => jwt.sign(payload, secret, opts);

beforeEach(() => {
  jest.spyOn(User, 'findById').mockImplementation(async (id) => {
    if (id === ADMIN_ID) return { _id: ADMIN_ID, name: 'Admin', role: 'admin' };
    if (id === USER_ID) return { _id: USER_ID, name: 'Cliente', role: 'user' };
    return null;
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Tokens forjados', () => {
  it('token com algoritmo "none" (sem assinatura) → 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ id: ADMIN_ID, role: 'admin' })).toString('base64url');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${header}.${body}.`);
    expect(res.status).toBe(401);
  });

  it('token assinado com outro segredo → 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${sign({ id: ADMIN_ID, role: 'admin' }, 'chute-de-segredo')}`);
    expect(res.status).toBe(401);
  });

  it('cliente que edita o token dizendo ser admin continua bloqueado (papel vem do banco) → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${sign({ id: USER_ID, role: 'admin' })}`);
    expect(res.status).toBe(403);
  });

  it('token expirado → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sign({ id: USER_ID }, undefined, { expiresIn: -10 })}`);
    expect(res.status).toBe(401);
  });
});

describe('Injeção e entradas maliciosas', () => {
  it('NoSQL injection no login ({ "$ne": null }) → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it('cadastro tentando virar admin: o campo "role" é descartado', () => {
    const { value } = schemas.register.validate(
      { name: 'Hacker', email: 'h@x.com', password: '123456', role: 'admin' },
      { stripUnknown: true }
    );
    expect(value.role).toBeUndefined();
  });

  it('imagem de produto com "javascript:" é recusada → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sign({ id: ADMIN_ID })}`)
      .send({ name: 'X', price: 1, category: 'buttons', images: ['javascript:alert(1)'] });
    expect(res.status).toBe(400);
  });

  it('pedido gigante (51 itens) é recusado → 400', async () => {
    const items = Array.from({ length: 51 }, () => ({ product: '64b0000000000000000000ff', quantity: 1 }));
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${sign({ id: USER_ID })}`)
      .send({ items, deliveryMethod: 'retirada' });
    expect(res.status).toBe(400);
  });

  it('trocar a senha sem informar a senha atual → 400', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${sign({ id: USER_ID })}`)
      .send({ password: 'novaSenha123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/senha atual/i);
  });

  it('JSON malformado → 400 sem vazar detalhes internos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('JSON inválido no corpo da requisição');
  });
});

describe('CORS', () => {
  it('site estranho não recebe permissão de CORS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://site-malicioso.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Força bruta no login', () => {
  it('depois de 10 tentativas o IP é bloqueado → 429', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app).post('/api/auth/login').send({ email: 'x', password: 'y' });
    }
    expect(last.status).toBe(429);
    expect(last.body.message).toMatch(/Muitas tentativas/);
  });
});
