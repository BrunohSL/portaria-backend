const { Router } = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/authorization');

const router = Router();

router.get('/', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), userController.list);
router.post('/', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), userController.create);
router.get('/:id', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), userController.getById);
router.put('/:id', authMiddleware, checkRole(['ADM', 'CLIENT_ADM']), userController.update);
router.delete('/:id', authMiddleware, checkRole(['ADM']), userController.delete);
router.post('/:id/reset-password', authMiddleware, checkRole(['ADM']), userController.resetPassword);

module.exports = router;
