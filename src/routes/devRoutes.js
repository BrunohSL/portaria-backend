const { Router } = require('express');
const seedController = require('../controllers/seedController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');
const { simulateCall, testNode } = require('../integrations/twilio/simulator');
const logger = require('../config/logger');

const router = Router();

// Endpoints de desenvolvimento — apenas ADM
router.post('/seed', authMiddleware, checkRole(['ADM']), seedController.populate);

// Simulador de chamada completa (sem ligação real). Doc: docs/simulator.md
router.post('/simulate-call', authMiddleware, checkRole(['ADM']), async (req, res) => {
  try {
    const result = await simulateCall(req.body ?? {});
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ msg: '[dev/simulate-call] erro', error: err.message, stack: err.stack });
    res.status(400).json({ success: false, error: err.message });
  }
});

// Testa um node isolado com input customizado (stateless).
router.post('/test-node', authMiddleware, checkRole(['ADM']), async (req, res) => {
  try {
    const result = await testNode(req.body ?? {});
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ msg: '[dev/test-node] erro', error: err.message, stack: err.stack });
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
