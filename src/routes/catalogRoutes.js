const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth');
const { INTENT_CATALOGS } = require('../constants/intentCatalogs');
const FlowType = require('../models/FlowType');
const UnitIdentificationLevel = require('../models/UnitIdentificationLevel');

const router = Router();

router.get('/flow-types', authMiddleware, async (_req, res, next) => {
  try {
    const rows = await FlowType.findAll({ order: [['sort_order', 'ASC']] });
    const items = rows.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      isRoot: r.is_root
    }));
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.get('/intent-catalogs', authMiddleware, (_req, res) => {
  const items = Object.entries(INTENT_CATALOGS).map(([key, def]) => ({
    key,
    label: def.label,
    description: def.description,
    intents: def.intents
  }));
  res.json({ success: true, data: items });
});

router.get('/unit-identification-levels', authMiddleware, async (_req, res, next) => {
  try {
    const rows = await UnitIdentificationLevel.findAll({
      where: { active: true },
      order: [['sort_order', 'ASC']]
    });
    const items = rows.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      sort_order: r.sort_order
    }));
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
