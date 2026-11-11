/**
 * Testes do serviço Mercado Pago com fetch "mockado" (não chama a API de verdade).
 */
process.env.NODE_ENV = 'test';
const mp = require('../src/services/mercadopago');

const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });
const orderResp = (status = 'action_required', qrBase64 = '') => ({
  id: 'ORD01TESTE',
  status,
  transactions: {
    payments: [{ id: 'PAY01', status, payment_method: { id: 'pix', qr_code: '00020126580014br.gov.bcb.pix', qr_code_base64: qrBase64, ticket_url: 'https://x' } }],
  },
});

beforeEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-teste';
  delete process.env.MERCADOPAGO_ENV;
  global.fetch = jest.fn();
});
afterEach(() => delete global.fetch);

describe('Mercado Pago — Pix', () => {
  it('cria a order Pix com Bearer token, idempotência e "APRO" no teste', async () => {
    fetch.mockReturnValueOnce(reply(orderResp()));
    const pix = await mp.createPix({ value: 44.8, payerEmail: 'a@b.com', payerName: 'Ana', externalReference: 'o1' });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(opts.headers.Authorization).toBe('Bearer APP_USR-teste');
    expect(opts.headers['X-Idempotency-Key']).toBeTruthy();
    const body = JSON.parse(opts.body);
    expect(body.total_amount).toBe('44.80');
    expect(body.transactions.payments[0].payment_method).toEqual({ id: 'pix', type: 'bank_transfer' });
    expect(body.payer.first_name).toBe('APRO'); // aprovação automática no teste

    expect(pix).toMatchObject({ id: 'ORD01TESTE', status: 'PENDING', brCode: '00020126580014br.gov.bcb.pix', devMode: true });
    expect(pix.brCodeBase64).toMatch(/^data:image\/png;base64,/); // gerado localmente quando vem vazio
  });

  it('em produção usa os dados reais do cliente', async () => {
    process.env.MERCADOPAGO_ENV = 'production';
    fetch.mockReturnValueOnce(reply(orderResp('action_required', 'iVBOR')));
    const pix = await mp.createPix({ value: 10, payerEmail: 'ana@email.com', payerName: 'Ana', externalReference: 'o1' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.payer).toEqual({ email: 'ana@email.com', first_name: 'Ana' });
    expect(pix.devMode).toBe(false);
    expect(pix.brCodeBase64).toBe('iVBOR');
  });

  it('order "processed" = pago', async () => {
    fetch.mockReturnValueOnce(reply(orderResp('processed')));
    expect((await mp.checkPix('ORD01TESTE')).status).toBe('PAID');
    expect(fetch.mock.calls[0][0]).toBe('https://api.mercadopago.com/v1/orders/ORD01TESTE');
  });

  it('token inválido → mensagem amigável', async () => {
    fetch.mockReturnValueOnce(reply({ message: 'unauthorized' }, 401));
    await expect(mp.checkPix('x')).rejects.toThrow(/Access Token do Mercado Pago inválido/);
  });

  it('sem token → 503 sem chamar a API', async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    await expect(mp.checkPix('x')).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
