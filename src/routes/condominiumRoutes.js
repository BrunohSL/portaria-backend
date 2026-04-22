const { Router } = require('express');
const condominiumController = require('../controllers/condominiumController');
const unitController = require('../controllers/unitController');
const residentController = require('../controllers/residentController');
const flowController = require('../controllers/flowController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole, checkCondominiumAccess } = require('../middlewares/authorization');

const router = Router();

// --- Condominiums ---

/**
 * @swagger
 * /api/condominiums:
 *   get:
 *     tags: [Condominiums]
 *     summary: Listar condominios
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de condominios
 */
router.get('/', authMiddleware, checkRole(['ADM']), condominiumController.list);

/**
 * @swagger
 * /api/condominiums:
 *   post:
 *     tags: [Condominiums]
 *     summary: Criar condominio
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Condominio criado
 */
router.post('/', authMiddleware, checkRole(['ADM']), condominiumController.create);

/**
 * @swagger
 * /api/condominiums/{id}:
 *   get:
 *     tags: [Condominiums]
 *     summary: Detalhe do condominio
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Condominio encontrado
 */
router.get('/:id', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, condominiumController.getById);

/**
 * @swagger
 * /api/condominiums/{id}:
 *   put:
 *     tags: [Condominiums]
 *     summary: Atualizar condominio
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Condominio atualizado
 */
router.put('/:id', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, condominiumController.update);

/**
 * @swagger
 * /api/condominiums/{id}:
 *   delete:
 *     tags: [Condominiums]
 *     summary: Excluir condominio
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Condominio excluido
 */
router.delete('/:id', authMiddleware, checkRole(['ADM']), condominiumController.delete);

// --- Units (nested under condominium) ---

router.get('/:id/units', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, unitController.list);
router.post('/:id/units', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.create);
router.put('/:id/units/:unitId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.update);
router.delete('/:id/units/:unitId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.delete);

// --- Residents (nested under condominium) ---

router.get('/:id/residents', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, residentController.list);
router.post('/:id/residents', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, residentController.create);
router.get('/:id/residents/:residentId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, residentController.getById);
router.put('/:id/residents/:residentId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, residentController.update);
router.delete('/:id/residents/:residentId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, residentController.delete);

// --- Flows (nested under condominium) ---

router.get('/:id/flows', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.list);
router.post('/:id/flows', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.create);
router.get('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.getById);
router.put('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.update);
router.delete('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.delete);

// --- Flow Steps ---

router.get('/:id/flows/:flowId/steps', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.listSteps);
router.post('/:id/flows/:flowId/steps', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.createStep);
router.put('/:id/flows/:flowId/steps/:stepId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.updateStep);
router.delete('/:id/flows/:flowId/steps/:stepId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.deleteStep);

module.exports = router;
