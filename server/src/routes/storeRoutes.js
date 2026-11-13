const router = require('express').Router();
const ctrl = require('../controllers/storeController');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');
const schemas = require('../validators/schemas');

router.get('/', ctrl.info);
router.put('/maintenance', protect, authorize('admin'), validate(schemas.maintenance), ctrl.setMaintenance);

module.exports = router;
