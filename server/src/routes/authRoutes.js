const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const schemas = require('../validators/schemas');
const { authLimiter } = require('../middlewares/rateLimit');

router.post('/register', authLimiter, validate(schemas.register), ctrl.register);
router.post('/login', authLimiter, validate(schemas.login), ctrl.login);
router.get('/me', protect, ctrl.me);

module.exports = router;
