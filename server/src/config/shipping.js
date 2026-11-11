/* Opções de entrega da loja. O valor do frete é definido AQUI (no backend),
 * nunca pelo navegador. Tudo pode ser ajustado pelo .env.
 *
 * Entrega local: só para os CEPs da área atendida (padrão: Boa Vista/RR,
 * CEPs 69300-000 a 69339-999). Fora disso, só retirada na loja.
 */
const DELIVERY_METHODS = ['entrega', 'retirada'];

/** "69300000-69339999,69340000-69349999" -> [[69300000, 69339999], ...] */
function cepRanges() {
  const raw = process.env.DELIVERY_CEP_RANGES || '69300000-69339999';
  return raw
    .split(',')
    .map((r) => r.split('-').map((n) => Number(n.replace(/\D/g, ''))))
    .filter(([a, b]) => a && b);
}

function isDeliverable(zip) {
  const n = Number(String(zip || '').replace(/\D/g, ''));
  return cepRanges().some(([a, b]) => n >= a && n <= b);
}

function shippingConfig() {
  const days = Number(process.env.DELIVERY_DAYS ?? 1);
  return {
    fee: Number(process.env.SHIPPING_FEE ?? 15),
    deliveryArea: process.env.DELIVERY_AREA || 'Boa Vista/RR',
    deliveryDays: days,
    deliveryTime: `até ${days} dia${days === 1 ? '' : 's'} út${days === 1 ? 'il' : 'eis'}`,
    pickupAddress: process.env.PICKUP_ADDRESS || 'Rua Exemplo, 123 – Centro, Boa Vista/RR',
    pickupInfo:
      process.env.PICKUP_INFO || 'Avisamos por e-mail quando o pedido estiver pronto. É só trazer o número do pedido.',
  };
}

module.exports = { DELIVERY_METHODS, shippingConfig, isDeliverable, cepRanges };
