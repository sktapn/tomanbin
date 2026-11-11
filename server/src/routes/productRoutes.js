const router = require('express').Router();
const ctrl = require('../controllers/productController');
const validate = require('../middlewares/validate');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');
const schemas = require('../validators/schemas');
const { CATEGORIES } = require('../models/Product');

// Público
router.get('/categories', (_req, res) => res.json(CATEGORIES));
router.get('/', optionalAuth, validate(schemas.listProducts, 'query'), ctrl.list);
router.get('/:id', optionalAuth, ctrl.getById);

// Somente admin
router.post('/', protect, authorize('admin'), validate(schemas.createProduct), ctrl.create);
router.put('/:id', protect, authorize('admin'), validate(schemas.updateProduct), ctrl.update);
router.delete('/:id', protect, authorize('admin'), ctrl.remove);

module.exports = router;
