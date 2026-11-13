const asyncHandler = require('../utils/asyncHandler');
const maintenance = require('../services/maintenance');
const { paymentTestMode } = require('./orderController');

// GET /api/store (público) — aviso de pagamento de teste e modo manutenção
exports.info = asyncHandler(async (_req, res) => {
  let m;
  try {
    m = await maintenance.getMaintenance();
  } catch {
    m = { enabled: false, message: maintenance.DEFAULT_MESSAGE }; // banco instável: não derruba o site
  }
  res.json({ paymentTestMode: paymentTestMode(), maintenance: m });
});

// PUT /api/store/maintenance (admin) — liga/desliga
exports.setMaintenance = asyncHandler(async (req, res) => {
  res.json({ maintenance: await maintenance.setMaintenance(req.body) });
});
