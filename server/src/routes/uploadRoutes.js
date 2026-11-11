const router = require('express').Router();
const ctrl = require('../controllers/uploadController');
const { protect, authorize } = require('../middlewares/auth');

// Só administradores enviam fotos
router.post('/image', protect, authorize('admin'), ctrl.receive, ctrl.image);

module.exports = router;
