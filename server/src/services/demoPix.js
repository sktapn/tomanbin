/**
 * Pix de DEMONSTRAÇÃO — usado quando não há gateway configurado (ou PAYMENT_PROVIDER=demo).
 * Gera um QR Code com cara de Pix, mas propositalmente INVÁLIDO (o código de verificação
 * é "DEMO"), então nenhum app de banco aceita pagar. O pagamento é confirmado pelo botão
 * "Simular pagamento".
 */
const crypto = require('crypto');
const QRCode = require('qrcode');

const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

function demoPayload({ value, txid }) {
  const merchant = tlv('00', 'br.gov.bcb.pix') + tlv('01', crypto.randomUUID());
  return (
    tlv('00', '01') +
    tlv('26', merchant) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', value.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', 'TOMANBIN DEMONSTRACAO') +
    tlv('60', 'BOA VISTA') +
    tlv('62', tlv('05', txid.slice(0, 25))) +
    '6304DEMO' // verificação inválida de propósito: não pode ser pago de verdade
  );
}

async function createPix({ value, externalReference }) {
  const txid = `DEMO${String(externalReference).slice(-12).toUpperCase()}`;
  const brCode = demoPayload({ value, txid });
  const brCodeBase64 = await QRCode.toDataURL(brCode, { margin: 1, width: 320 });
  return {
    id: `demo_${crypto.randomBytes(6).toString('hex')}`,
    status: 'PENDING',
    brCode,
    brCodeBase64,
    devMode: true,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
  };
}

module.exports = { createPix };
