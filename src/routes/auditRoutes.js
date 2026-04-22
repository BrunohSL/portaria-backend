const { Router } = require('express');
const auditController = require('../controllers/auditController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');

const router = Router();

/**
 * @swagger
 * /api/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Listar logs de auditoria
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get('/', authMiddleware, checkRole(['ADM']), auditController.list);

module.exports = router;
