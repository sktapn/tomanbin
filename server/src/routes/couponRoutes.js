const router = require('express').Router();
const ctrl = require('../controllers/couponController');
const validate = require('../middlewares/validate');
const { protect, optionalAuth, authorize } = require('../middlewares/auth');
const { couponLimiter } = require('../middlewares/rateLimit');
const schemas = require('../validators/schemas');

// Público: cupom em destaque na faixa da loja
router.get('/banner', ctrl.banner);

// Público (com login opcional): limite de tentativas contra quem tenta adivinhar códigos
router.post('/validate', couponLimiter, optionalAuth, validate(schemas.validateCoupon), ctrl.validate);

// Somente admin
router.use(protect, authorize('admin'));
router.get('/', ctrl.list);
router.post('/', validate(schemas.coupon), ctrl.create);
router.put('/:id', validate(schemas.couponUpdate), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
