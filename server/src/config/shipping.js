/* Opções de entrega da loja. O valor do frete é definido AQUI (no backend),
 * nunca pelo navegador. Pode ser alterado pelo .env (SHIPPING_FEE e PICKUP_INFO). */
const DELIVERY_METHODS = ['entrega', 'retirada'];

function shippingConfig() {
  return {
    fee: Number(process.env.SHIPPING_FEE ?? 15),
    pickupInfo:
      process.env.PICKUP_INFO ||
      'Retirada combinada com a Tomanbin após a confirmação do pagamento (avisamos por e-mail).',
  };
}

module.exports = { DELIVERY_METHODS, shippingConfig };
