const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/customController');
const upload = require('../controllers/uploadController');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');
const schemas = require('../validators/schemas');

// Envio de imagens pelos clientes: até 30 por hora por pessoa
const artLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id), // a rota exige login: limite por conta
  handler: (_req, res) => res.status(429).json({ message: 'Muitas imagens enviadas. Tente de novo mais tarde.' }),
});

router.get('/', ctrl.get);
router.post('/art', protect, artLimiter, upload.receiveArt, ctrl.uploadArt);

router.get('/admin', protect, authorize('admin'), ctrl.adminGet);
router.put('/', protect, authorize('admin'), validate(schemas.customConfig), ctrl.update);

module.exports = router;
