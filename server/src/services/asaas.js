/**
 * Integração com o Asaas (cobrança Pix) — https://docs.asaas.com
 * Sandbox:  https://api-sandbox.asaas.com/v3  (chave começa com $aact_hmlg_)
 * Produção: https://api.asaas.com/v3          (chave começa com $aact_prod_)
 */
const AppError = require('../utils/AppError');

function config() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new AppError('Pagamento indisponível: configure ASAAS_API_KEY no .env do servidor', 503);
  const env = process.env.ASAAS_ENV || (key.includes('_prod_') ? 'production' : 'sandbox');
  const sandbox = env !== 'production';
  return {
    key,
    sandbox,
    baseUrl: sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3',
  };
}

async function request(method, path, body) {
  const { key, baseUrl } = config();
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        access_token: key,
        'Content-Type': 'application/json',
        'User-Agent': 'Tomanbin/1.0', // o Asaas exige User-Agent
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AppError('Não foi possível falar com o Asaas. Tente novamente.', 502);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new AppError('Chave do Asaas inválida. Confira ASAAS_API_KEY no .env.', 502);
    // Erros do Asaas vêm como { errors: [{ code, description }] }
    const msg = json.errors?.map((e) => e.description).join(' ') || `erro ${res.status}`;
    throw new AppError(`Asaas: ${msg}`, 502);
  }
  return json;
}

// Data de hoje no fuso de Brasília (YYYY-MM-DD)
const todayBR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

// "2026-11-02 23:59:59" (horário de Brasília) -> Date
const parseBRDate = (s) => (s ? new Date(`${s.replace(' ', 'T')}-03:00`) : null);

/** Status do Asaas -> status simples usado na loja */
function normalizeStatus(status) {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID';
  if (status === 'OVERDUE') return 'EXPIRED';
  if (status?.startsWith('REFUND')) return 'REFUNDED';
  if (status === 'DELETED') return 'CANCELLED';
  return 'PENDING';
}

/** Cria (ou reaproveita) o cliente no Asaas */
async function ensureCustomer({ customerId, cpfChanged, name, email, cpf, externalReference }) {
  if (customerId) {
    // mantém o CPF atualizado no cadastro do Asaas
    if (cpfChanged) await request('PUT', `/customers/${customerId}`, { cpfCnpj: cpf });
    return customerId;
  }
  const c = await request('POST', '/customers', { name, email, cpfCnpj: cpf, externalReference });
  return c.id;
}

/** Cria a cobrança Pix e já busca o QR Code */
async function createPix({ customerId, value, description, externalReference }) {
  const payment = await request('POST', '/payments', {
    customer: customerId,
    billingType: 'PIX',
    value,
    dueDate: todayBR(),
    description,
    externalReference,
  });
  const qr = await request('GET', `/payments/${payment.id}/pixQrCode`);
  return {
    id: payment.id,
    status: normalizeStatus(payment.status),
    brCode: qr.payload, // copia e cola
    brCodeBase64: qr.encodedImage, // PNG em base64
    expiresAt: parseBRDate(qr.expirationDate),
    devMode: config().sandbox,
  };
}

async function checkPix(id) {
  const p = await request('GET', `/payments/${id}`);
  return { status: normalizeStatus(p.status), raw: p.status };
}

/** Só no Sandbox: confirma o pagamento da cobrança */
async function simulatePix(id) {
  if (!config().sandbox) throw new AppError('Simulação só existe no Sandbox do Asaas', 403);
  return request('POST', `/sandbox/payment/${id}/confirm`);
}

module.exports = { ensureCustomer, createPix, checkPix, simulatePix, normalizeStatus, isSandbox: () => config().sandbox };
