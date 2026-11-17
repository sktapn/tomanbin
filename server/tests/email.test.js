/** E-mails: boas-vindas no cadastro e respostas indo para o e-mail da loja */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const User = require('../src/models/User');
const email = require('../src/services/email');
const tpl = require('../src/services/emailTemplates');
const app = require('../src/app');

afterEach(() => jest.restoreAllMocks());

describe('Boas-vindas', () => {
  it('quem cria conta recebe o e-mail de boas-vindas', async () => {
    jest.spyOn(email, 'isTest').mockReturnValue(false);
    const send = jest.spyOn(email, 'sendEmail').mockResolvedValue({});
    jest.spyOn(User, 'create').mockImplementation(async (d) => ({ _id: '64b000000000000000000009', ...d, toJSON: () => ({ name: d.name }) }));
    const res = await request(app).post('/api/auth/register').send({ name: 'Ana Souza', email: 'ana@x.com', password: 'Senha123' });
    expect(res.status).toBe(201);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@x.com', subject: expect.stringMatching(/Boas-vindas/) }));
    expect(send.mock.calls[0][0].html).toContain('Oi, Ana!');
  });

  it('e-mail que falha não impede o cadastro', async () => {
    jest.spyOn(email, 'isTest').mockReturnValue(false);
    jest.spyOn(email, 'sendEmail').mockRejectedValue(new Error('Resend fora do ar'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(User, 'create').mockImplementation(async (d) => ({ _id: '64b000000000000000000009', ...d, toJSON: () => ({}) }));
    const res = await request(app).post('/api/auth/register').send({ name: 'Bia', email: 'bia@x.com', password: 'Senha123' });
    expect(res.status).toBe(201);
  });

  it('nome com HTML não vira código no e-mail', () => {
    const { html } = tpl.welcome({ name: '<img src=x onerror=alert(1)> Silva' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});

describe('Envio pelo Resend', () => {
  const env = { ...process.env };
  let body;
  beforeEach(() => {
    Object.assign(process.env, { EMAIL_IN_TESTS: '1', RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Tomanbin <contato@tomanbin.shop>' });
    global.fetch = jest.fn(async (_url, opts) => {
      body = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ id: 'e1' }) };
    });
  });
  afterEach(() => {
    process.env = { ...env };
    delete global.fetch;
  });

  it('sai pelo endereço do domínio e as respostas vão para o e-mail da loja', async () => {
    process.env.EMAIL_REPLY_TO = 'loja@gmail.com';
    await email.sendEmail({ to: 'cliente@x.com', subject: 'Oi', html: '<p>oi</p>' });
    expect(body).toMatchObject({ from: 'Tomanbin <contato@tomanbin.shop>', to: ['cliente@x.com'], reply_to: 'loja@gmail.com' });
  });

  it('sem EMAIL_REPLY_TO não manda reply_to', async () => {
    delete process.env.EMAIL_REPLY_TO;
    await email.sendEmail({ to: 'cliente@x.com', subject: 'Oi', html: '<p>oi</p>' });
    expect(body).not.toHaveProperty('reply_to');
  });
});
