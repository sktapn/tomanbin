const router = require('express').Router();
const ctrl = require('../controllers/userController');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');
const schemas = require('../validators/schemas');

router.use(protect);

router.put('/me', validate(schemas.updateMe), ctrl.updateMe);

// Somente admin
router.get('/', authorize('admin'), ctrl.list);
router.get('/:id', authorize('admin'), ctrl.getById);
router.put('/:id', authorize('admin'), validate(schemas.adminUpdateUser), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
