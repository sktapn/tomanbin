/**
 * "Esqueci minha senha": link por e-mail, uso único, expira e derruba sessões antigas.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const email = require('../src/services/email');
const app = require('../src/app');

const USER_ID = '64b000000000000000000002';
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

beforeEach(() => {
  jest.spyOn(email, 'sendEmail').mockResolvedValue({});
});
afterEach(() => jest.restoreAllMocks());

describe('Esqueci minha senha', () => {
  it('e-mail com conta: salva só o HASH do token e manda o link', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ _id: USER_ID, name: 'Ana Souza', email: 'ana@x.com' });
    const upd = jest.spyOn(User, 'updateOne').mockResolvedValue({});
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ANA@x.com' });

    expect(res.status).toBe(200);
    const saved = upd.mock.calls[0][1];
    const sentHtml = email.sendEmail.mock.calls[0][0].html;
    const token = sentHtml.match(/token=([a-f0-9]{64})/)[1];
    expect(saved.resetTokenHash).toBe(sha(token)); // banco não guarda o token puro
    expect(saved.resetTokenHash).not.toBe(token);
    expect(saved.resetTokenExpires.getTime()).toBeGreaterThan(Date.now() + 55 * 60_000);
  });

  it('e-mail sem conta: avisa que não está cadastrado e não envia nada', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ninguem@x.com' });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Não encontramos uma conta/);
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('se o envio falhar, avisa o cliente em vez de dizer que mandou', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ _id: USER_ID, name: 'Ana', email: 'ana@x.com' });
    jest.spyOn(User, 'updateOne').mockResolvedValue({});
    email.sendEmail.mockResolvedValue({ error: 'domínio não verificado' });
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ana@x.com' });
    expect(res.status).toBe(502);
  });
});

describe('Redefinir senha', () => {
  const token = 'a'.repeat(64);

  it('token válido: troca a senha, apaga o token e faz login', async () => {
    const user = { _id: USER_ID, role: 'user', save: jest.fn(async () => {}) };
    const find = jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => user });
    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'novaSenha123' });

    expect(res.status).toBe(200);
    expect(find.mock.calls[0][0].resetTokenHash).toBe(sha(token));
    expect(find.mock.calls[0][0].resetTokenExpires.$gt).toBeInstanceOf(Date); // expirado não serve
    expect(user.password).toBe('novaSenha123');
    expect(user.resetTokenHash).toBeUndefined(); // uso único
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(res.body.token).toBeTruthy();
  });

  it('token inválido/expirado → 400', async () => {
    jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'novaSenha123' });
    expect(res.status).toBe(400);
  });

  it('token mal formado ou senha curta → 400 sem consultar o banco', async () => {
    const find = jest.spyOn(User, 'findOne');
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'novaSenha123' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: '123' })).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it('login antigo para de valer depois da troca de senha', async () => {
    const oldToken = jwt.sign({ id: USER_ID, iat: Math.floor(Date.now() / 1000) - 3600 }, process.env.JWT_SECRET);
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: USER_ID, role: 'user', passwordChangedAt: new Date() });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(res.status).toBe(401);
  });
});

describe('Modelos de e-mail', () => {
  const tpl = require('../src/services/emailTemplates');
  const order = {
    _id: '64b0000000000000000abcde', items: [{ name: '<script>x</script>', price: 10, quantity: 2 }],
    subtotal: 20, shippingFee: 15, discount: 2, couponCode: 'BEMVINDO10', total: 33,
    deliveryMethod: 'entrega', trackingCode: 'AA123456789BR',
    shippingAddress: { street: 'Rua A', number: '1', neighborhood: 'Centro', city: 'Boa Vista', state: 'RR', zip: '69301-000' },
  };
  const user = { name: 'Ana <b>Souza</b>', email: 'ana@x.com' };

  it('escapa texto do cliente (sem HTML injetado)', () => {
    const { html } = tpl.orderReceived(order, user);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('R$ 33,00');
    expect(html).toContain('BEMVINDO10');
  });

  it('e-mail de envio traz o código de rastreio', () => {
    const { subject, html } = tpl.orderShipped(order, user);
    expect(subject).toContain('ABCDE');
    expect(html).toContain('AA123456789BR');
  });
});
