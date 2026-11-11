/**
 * Testes do serviço Asaas com fetch "mockado" (não chama a API de verdade).
 */
process.env.NODE_ENV = 'test';
const asaas = require('../src/services/asaas');
const { isValidCpf } = require('../src/utils/cpf');

const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  process.env.ASAAS_API_KEY = '$aact_hmlg_teste';
  delete process.env.ASAAS_ENV;
  global.fetch = jest.fn();
});
afterEach(() => delete global.fetch);

describe('Asaas — cobrança Pix', () => {
  it('usa o Sandbox, cria a cobrança PIX e busca o QR Code', async () => {
    fetch
      .mockReturnValueOnce(reply({ id: 'pay_1', status: 'PENDING' }))
      .mockReturnValueOnce(reply({ encodedImage: 'iVBOR', payload: '000201', expirationDate: '2026-11-02 23:59:59' }));

    const pix = await asaas.createPix({ customerId: 'cus_1', value: 24.9, description: 'Pedido', externalReference: 'o1' });

    const [url1, opts1] = fetch.mock.calls[0];
    expect(url1).toBe('https://api-sandbox.asaas.com/v3/payments');
    expect(opts1.headers.access_token).toBe('$aact_hmlg_teste');
    const body = JSON.parse(opts1.body);
    expect(body).toMatchObject({ customer: 'cus_1', billingType: 'PIX', value: 24.9, externalReference: 'o1' });
    expect(body.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fetch.mock.calls[1][0]).toBe('https://api-sandbox.asaas.com/v3/payments/pay_1/pixQrCode');

    expect(pix).toMatchObject({ id: 'pay_1', status: 'PENDING', brCode: '000201', brCodeBase64: 'iVBOR', devMode: true });
    expect(pix.expiresAt.toISOString()).toBe('2026-11-03T02:59:59.000Z');
  });

  it('chave de produção usa a URL de produção', async () => {
    process.env.ASAAS_API_KEY = '$aact_prod_xyz';
    fetch.mockReturnValueOnce(reply({ status: 'RECEIVED' }));
    const r = await asaas.checkPix('pay_9');
    expect(fetch.mock.calls[0][0]).toBe('https://api.asaas.com/v3/payments/pay_9');
    expect(r.status).toBe('PAID');
  });

  it('simulação chama a rota de Sandbox', async () => {
    fetch.mockReturnValueOnce(reply({ id: 'pay_1', status: 'RECEIVED' }));
    await asaas.simulatePix('pay_1');
    expect(fetch.mock.calls[0][0]).toBe('https://api-sandbox.asaas.com/v3/sandbox/payment/pay_1/confirm');
  });

  it('converte os status do Asaas', () => {
    expect(asaas.normalizeStatus('CONFIRMED')).toBe('PAID');
    expect(asaas.normalizeStatus('OVERDUE')).toBe('EXPIRED');
    expect(asaas.normalizeStatus('PENDING')).toBe('PENDING');
  });

  it('mostra a mensagem de erro do Asaas', async () => {
    fetch.mockReturnValueOnce(reply({ errors: [{ code: 'invalid_cpfCnpj', description: 'CPF inválido.' }] }, 400));
    await expect(asaas.checkPix('x')).rejects.toThrow('Asaas: CPF inválido.');
  });

  it('sem chave → 503 sem chamar a API', async () => {
    delete process.env.ASAAS_API_KEY;
    await expect(asaas.checkPix('x')).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Validação de CPF', () => {
  it('aceita CPF válido e recusa inválido', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123.456.789-00')).toBe(false);
  });
});

describe('Pix de demonstração', () => {
  const demoPix = require('../src/services/demoPix');
  it('gera QR Code e copia-e-cola que NÃO podem ser pagos de verdade', async () => {
    const pix = await demoPix.createPix({ value: 29.8, externalReference: '64b0000000000000000000aa' });
    expect(pix.id).toMatch(/^demo_/);
    expect(pix.devMode).toBe(true);
    expect(pix.brCodeBase64).toMatch(/^data:image\/png;base64,/);
    expect(pix.brCode).toContain('540529.80'); // valor no formato Pix
    expect(pix.brCode.endsWith('6304DEMO')).toBe(true); // verificação inválida de propósito
  });
});
