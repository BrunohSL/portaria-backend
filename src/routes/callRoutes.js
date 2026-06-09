const { Router } = require('express');
const callController = require('../controllers/callController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');

const router = Router();

/**
 * @swagger
 * /api/calls/sessions:
 *   get:
 *     tags: [Calls]
 *     summary: Listar sessoes de chamada
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: condominium_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de sessoes
 */
router.get('/sessions', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), callController.listSessions);

/**
 * @swagger
 * /api/calls/sessions/{id}:
 *   get:
 *     tags: [Calls]
 *     summary: Detalhe da sessao
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sessao encontrada
 */
router.get('/sessions/:id', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), callController.getSession);

/**
 * @swagger
 * /api/calls/sessions/{id}/logs:
 *   get:
 *     tags: [Calls]
 *     summary: Logs da sessao
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Logs da sessao
 */
router.get('/sessions/:id/logs', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), callController.getSessionLogs);

module.exports = router;
