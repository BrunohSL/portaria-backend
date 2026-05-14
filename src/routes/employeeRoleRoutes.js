const { Router } = require('express');
const employeeController = require('../controllers/employeeController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');

const router = Router();

// Listar cargos disponiveis (qualquer usuario autenticado)
router.get('/', authMiddleware, checkRole(['ADM', 'CLIENT_ADM', 'SUPPORT']), employeeController.listRoles);

// Criar novo cargo (somente ADM)
router.post('/', authMiddleware, checkRole(['ADM']), employeeController.createRole);

module.exports = router;
