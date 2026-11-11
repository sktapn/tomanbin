const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');
const schemas = require('../validators/schemas');

// Público: valor do frete e informações de retirada
router.get('/shipping', ctrl.shippingOptions);

router.use(protect);

// Usuário logado
router.post('/', validate(schemas.createOrder), ctrl.create);
router.get('/mine', ctrl.mine);
router.patch('/:id/cancel', ctrl.cancel);

// Pagamento Pix (dono ou admin)
router.post('/:id/pay', validate(schemas.payOrder), ctrl.pay);
router.get('/:id/payment', ctrl.paymentStatus);
router.post('/:id/payment/simulate', ctrl.simulatePayment);

// Somente admin (rotas fixas antes de "/:id")
router.get('/stats', authorize('admin'), ctrl.stats);
router.get('/', authorize('admin'), ctrl.list);
router.patch('/:id/status', authorize('admin'), validate(schemas.updateOrderStatus), ctrl.updateStatus);
router.delete('/:id', authorize('admin'), ctrl.remove);

// Dono ou admin
router.get('/:id', ctrl.getById);

module.exports = router;
