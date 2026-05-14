const { Router } = require('express');
const condominiumController = require('../controllers/condominiumController');
const unitController = require('../controllers/unitController');
const contactController = require('../controllers/contactController');
const flowController = require('../controllers/flowController');
const employeeController = require('../controllers/employeeController');
const employeeShiftController = require('../controllers/employeeShiftController');
const gateController = require('../controllers/gateController');
const extensionController = require('../controllers/extensionController');
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
router.put('/:id/units/batch', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.batchUpdate);
router.post('/:id/units/import', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.importCsv);
router.put('/:id/units/:unitId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.update);
router.delete('/:id/units/:unitId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, unitController.delete);

// --- Contacts (nested under condominium) ---

router.get('/:id/contacts', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, contactController.list);
router.post('/:id/contacts', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.create);
router.post('/:id/contacts/batch', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.batchCreate);
router.put('/:id/contacts/batch', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.batchUpdate);
router.post('/:id/contacts/import', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.importCsv);
router.get('/:id/contacts/:contactId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, contactController.getById);
router.put('/:id/contacts/:contactId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.update);
router.delete('/:id/contacts/:contactId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, contactController.delete);

// --- Flows (nested under condominium) ---

router.get('/:id/flows', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.list);
router.post('/:id/flows', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.create);
router.get('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.getById);
router.put('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.update);
router.delete('/:id/flows/:flowId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.delete);

// --- Flow Nodes ---

router.get('/:id/flows/:flowId/nodes', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.listNodes);
router.post('/:id/flows/:flowId/nodes', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.createNode);
router.put('/:id/flows/:flowId/nodes/:nodeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.updateNode);
router.delete('/:id/flows/:flowId/nodes/:nodeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.deleteNode);

// --- Flow Edges ---

router.post('/:id/flows/:flowId/edges', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.createEdge);
router.delete('/:id/flows/:flowId/edges/:edgeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.deleteEdge);

// --- Flow validation / entry node ---

router.get('/:id/flows/:flowId/validate', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, flowController.validate);
router.put('/:id/flows/:flowId/entry-node', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, flowController.setEntryNode);

// --- Gates ---

router.get('/:id/gates', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, gateController.list);
router.post('/:id/gates', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, gateController.create);
router.put('/:id/gates/:gateId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, gateController.update);
router.delete('/:id/gates/:gateId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, gateController.delete);

// --- Employee roles usados naquele condomÃ­nio ---

router.get('/:id/employee-roles', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, employeeController.listRolesForCondominium);

// --- Extensions ---

router.get('/:id/extensions', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, extensionController.list);
router.post('/:id/extensions', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, extensionController.create);
router.put('/:id/extensions/:extensionId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, extensionController.update);
router.delete('/:id/extensions/:extensionId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, extensionController.delete);

// --- Employees (nested under condominium) ---

router.get('/:id/employees', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, employeeController.list);
router.post('/:id/employees', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeController.create);
router.put('/:id/employees/batch', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeController.batchUpdate);
router.post('/:id/employees/import', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeController.importCsv);
router.get('/:id/employees/:employeeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, employeeController.getById);
router.put('/:id/employees/:employeeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeController.update);
router.delete('/:id/employees/:employeeId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeController.delete);

// --- Employee Shifts (escala de horarios) ---

router.get('/:id/employees/:employeeId/shifts', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), checkCondominiumAccess, employeeShiftController.list);
router.post('/:id/employees/:employeeId/shifts', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeShiftController.create);
router.delete('/:id/employees/:employeeId/shifts/:shiftId', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), checkCondominiumAccess, employeeShiftController.delete);

module.exports = router;
