/**
 * Equivalentes, no nosso MongoDB + API, do checklist de banco de dados:
 * tempo máximo de consulta, trilha de auditoria e controle de acesso conferido rota a rota.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const AuditLog = require('../src/models/AuditLog');
const { protect, authorize } = require('../src/middlewares/auth');
const { cleanPath } = require('../src/middlewares/audit');

const ADMIN_ID = '64b000000000000000000001';
afterEach(() => jest.restoreAllMocks());

describe('Tempo máximo por consulta (statement_timeout)', () => {
  it('toda leitura sai com maxTimeMS de 5s', async () => {
    const spy = jest.spyOn(mongoose.Query.prototype, 'maxTimeMS');
    mongoose.set('bufferCommands', false); // sem banco: falha na hora em vez de esperar
    await Product.find({}).exec().catch(() => {});
    mongoose.set('bufferCommands', true);
    expect(spy).toHaveBeenCalledWith(5000);
  });
});

describe('Trilha de auditoria', () => {
  const flush = () => new Promise((r) => setImmediate(r));
  const audit = require('../src/middlewares/audit');
  beforeEach(() => jest.spyOn(audit, 'dbReady').mockReturnValue(true));

  it('registra leitura de dados de clientes feita por admin', async () => {
    const create = jest.spyOn(AuditLog, 'create').mockResolvedValue({});
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: ADMIN_ID, role: 'admin' });
    jest.spyOn(User, 'find').mockReturnValue({ sort: async () => [] });
    await request(app).get('/api/users').set('Authorization', `Bearer ${jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET)}`);
    await flush();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ event: 'admin.acesso', method: 'GET', path: '/api/users', status: 200 }));
  });

  it('registra login que deu errado (com o e-mail tentado e o IP)', async () => {
    const create = jest.spyOn(AuditLog, 'create').mockResolvedValue({});
    jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
    await request(app).post('/api/auth/login').send({ email: 'alvo@x.com', password: 'chute123' });
    await flush();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ event: 'login.falhou', email: 'alvo@x.com', status: 401 }));
    expect(create.mock.calls[0][0]).not.toHaveProperty('password');
  });

  it('não grava segredos que venham na URL', () => {
    expect(cleanPath('/redefinir?token=abc123&x=1')).toBe('/redefinir?token=***&x=1');
  });
});

describe('Controle de acesso conferido rota a rota (equivalente ao RLS por tabela)', () => {
  // Rotas que podem ser abertas sem login. QUALQUER rota nova fora desta lista
  // precisa de login, senão este teste falha e avisa antes do deploy.
  const PUBLIC = new Set([
    'POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password',
    'GET /api/products/', 'GET /api/products/:id', 'GET /api/products/categories',
    'GET /api/orders/shipping',
    'GET /api/coupons/banner', 'POST /api/coupons/validate',
    'POST /api/webhooks/mercadopago',
    'GET /api/custom/',
    'GET /api/store/',
  ]);
  const MOUNTS = {
    '/api/auth': require('../src/routes/authRoutes'),
    '/api/users': require('../src/routes/userRoutes'),
    '/api/products': require('../src/routes/productRoutes'),
    '/api/orders': require('../src/routes/orderRoutes'),
    '/api/coupons': require('../src/routes/couponRoutes'),
    '/api/uploads': require('../src/routes/uploadRoutes'),
    '/api/webhooks': require('../src/routes/webhookRoutes'),
    '/api/custom': require('../src/routes/customRoutes'),
    '/api/store': require('../src/routes/storeRoutes'),
  };

  const routes = [];
  for (const [base, router] of Object.entries(MOUNTS)) {
    let guarded = false; // router.use(protect) vale para as rotas declaradas depois dele
    for (const layer of router.stack) {
      if (!layer.route) {
        if (layer.handle === protect) guarded = true;
        continue;
      }
      const handlers = layer.route.stack.map((l) => l.handle);
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ key: `${method.toUpperCase()} ${base}${layer.route.path}`, guarded: guarded || handlers.includes(protect) });
      }
    }
  }

  it('encontrou as rotas da API', () => expect(routes.length).toBeGreaterThan(30));

  it.each(routes.map((r) => [r.key, r]))('%s', (key, r) => {
    if (PUBLIC.has(key)) return; // pública de propósito
    expect(r.guarded).toBe(true);
  });

  it('as rotas de admin respondem 401 sem login', async () => {
    for (const [m, url] of [['get', '/api/users'], ['get', '/api/orders'], ['get', '/api/orders/stats'], ['get', '/api/coupons'], ['post', '/api/products'], ['post', '/api/uploads/image']]) {
      const res = await request(app)[m](url);
      expect(res.status).toBe(401);
    }
  });
});
