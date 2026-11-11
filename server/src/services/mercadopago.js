/**
 * Integração com o Mercado Pago (Pix) — API de Orders
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders
 *
 * Credencial: só o Access Token (fica no backend). A mesma URL atende teste e produção;
 * o que muda é o token. Como o token de teste também começa com APP_USR, o ambiente
 * é informado por MERCADOPAGO_ENV (sandbox | production). Padrão: sandbox.
 *
 * No ambiente de teste, enviar payer.first_name = "APRO" faz o Mercado Pago aprovar
 * o Pix sozinho alguns segundos depois de criado (é o "simular pagamento" deles).
 */
const crypto = require('crypto');
const QRCode = require('qrcode');
const AppError = require('../utils/AppError');

const BASE_URL = 'https://api.mercadopago.com';

function config() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new AppError('Pagamento indisponível: configure MERCADOPAGO_ACCESS_TOKEN no .env do servidor', 503);
  const sandbox = (process.env.MERCADOPAGO_ENV || 'sandbox') !== 'production';
  return { token, sandbox };
}

async function request(method, path, body, extraHeaders = {}) {
  const { token } = config();
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AppError('Não foi possível falar com o Mercado Pago. Tente novamente.', 502);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new AppError('Access Token do Mercado Pago inválido. Confira MERCADOPAGO_ACCESS_TOKEN.', 502);
    // Formatos de erro: { errors: [{ message }] } ou { message, cause: [{ description }] }
    const msg =
      json.errors?.map((e) => e.message || e.code).join(' ') ||
      json.cause?.map((c) => c.description).join(' ') ||
      json.message ||
      `erro ${res.status}`;
    throw new AppError(`Mercado Pago: ${msg}`, 502);
  }
  return json;
}

/** Status do Mercado Pago -> status simples usado na loja */
function normalizeStatus(order) {
  const s = order?.status;
  const payment = order?.transactions?.payments?.[0];
  if (s === 'processed' || ['processed', 'approved', 'accredited'].includes(payment?.status)) return 'PAID';
  if (s === 'expired') return 'EXPIRED';
  if (s === 'refunded') return 'REFUNDED';
  if (['canceled', 'cancelled', 'failed'].includes(s)) return 'CANCELLED';
  return 'PENDING'; // created, processing, action_required...
}

const money = (v) => Number(v).toFixed(2);

/** Cria a cobrança Pix (order) e devolve QR Code + copia e cola */
async function createPix({ value, payerEmail, payerName, externalReference, idempotencyKey }) {
  const { sandbox } = config();
  const order = await request(
    'POST',
    '/v1/orders',
    {
      type: 'online',
      processing_mode: 'automatic',
      external_reference: externalReference,
      total_amount: money(value),
      payer: {
        // No teste, "APRO" faz o Mercado Pago aprovar o pagamento automaticamente
        email: sandbox ? 'test@testuser.com' : payerEmail,
        first_name: sandbox ? 'APRO' : payerName,
      },
      transactions: {
        payments: [{ amount: money(value), payment_method: { id: 'pix', type: 'bank_transfer' } }],
      },
    },
    { 'X-Idempotency-Key': idempotencyKey || crypto.randomUUID() }
  );

  const pm = order.transactions?.payments?.[0]?.payment_method || {};
  if (!pm.qr_code) throw new AppError('Mercado Pago não devolveu o código Pix. Verifique se o Pix está habilitado na conta.', 502);

  // Às vezes (principalmente no teste) a imagem vem vazia: geramos a partir do copia e cola
  const brCodeBase64 = pm.qr_code_base64 || (await QRCode.toDataURL(pm.qr_code, { margin: 1, width: 320 }));

  return {
    id: order.id,
    status: normalizeStatus(order),
    brCode: pm.qr_code,
    brCodeBase64,
    ticketUrl: pm.ticket_url,
    devMode: sandbox,
    expiresAt: pm.date_of_expiration ? new Date(pm.date_of_expiration) : new Date(Date.now() + 24 * 3600_000),
  };
}

async function checkPix(id) {
  const order = await request('GET', `/v1/orders/${encodeURIComponent(id)}`);
  return { status: normalizeStatus(order), raw: order.status };
}

module.exports = { createPix, checkPix, normalizeStatus, isSandbox: () => config().sandbox };
