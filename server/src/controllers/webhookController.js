const crypto = require('crypto');
const { syncByPixId } = require('./orderController');

/**
 * Valida a assinatura x-signature enviada pelo Mercado Pago.
 * Formato do cabeçalho: "ts=1704908010,v1=<hmac>"
 * Texto assinado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com HMAC-SHA256 e a
 * "assinatura secreta" da aplicação (Suas integrações > Webhooks).
 */
function validMercadoPagoSignature(req, dataId, secret) {
  const header = req.get('x-signature') || '';
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=').map((x) => x.trim()))
  );
  if (!parts.ts || !parts.v1) return false;

  const requestId = req.get('x-request-id');
  // IDs alfanuméricos entram em minúsculas no texto assinado
  let manifest = `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/webhooks/mercadopago
 * O Mercado Pago avisa que uma cobrança mudou. Por segurança NÃO usamos o conteúdo do aviso:
 * só pegamos o id e consultamos o status direto na API do Mercado Pago.
 */
exports.mercadopago = async (req, res) => {
  const dataId = req.query['data.id'] || req.body?.data?.id;
  if (!dataId) return res.status(200).json({ ok: true, ignored: 'sem data.id' });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret && !validMercadoPagoSignature(req, dataId, secret)) {
    return res.status(401).json({ message: 'Assinatura inválida' });
  }

  try {
    // o id pode chegar em maiúsculas ou minúsculas: tenta os dois
    const order = (await syncByPixId('mercadopago', dataId)) || (await syncByPixId('mercadopago', String(dataId).toUpperCase()));
    return res.status(200).json({ ok: true, found: Boolean(order) });
  } catch (err) {
    // Erro ao consultar o gateway: responde 500 para o Mercado Pago tentar de novo mais tarde
    console.error('Webhook Mercado Pago:', err.message);
    return res.status(500).json({ message: 'Tente novamente' });
  }
};

exports.validMercadoPagoSignature = validMercadoPagoSignature;
