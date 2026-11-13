const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const schemas = require('../validators/schemas');
const { authLimiter } = require('../middlewares/rateLimit');
const duringMaintenance = require('../middlewares/maintenance');

router.post('/register', authLimiter, duringMaintenance, validate(schemas.register), ctrl.register);
router.post('/login', authLimiter, validate(schemas.login), ctrl.login);
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), ctrl.resetPassword);
router.get('/me', protect, ctrl.me);

module.exports = router;
