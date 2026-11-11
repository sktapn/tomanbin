const router = require('express').Router();
const ctrl = require('../controllers/webhookController');

// Avisos automáticos dos gateways de pagamento (sem login: a segurança é a assinatura)
router.post('/mercadopago', ctrl.mercadopago);

module.exports = router;
