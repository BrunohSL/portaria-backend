const { Router } = require('express');
const visitorDataFieldController = require('../controllers/visitorDataFieldController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');

const router = Router();

router.get('/', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), visitorDataFieldController.list);

module.exports = router;
