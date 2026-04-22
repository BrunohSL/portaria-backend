const { Router } = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login realizado
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Alterar senha
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_password]
 *             properties:
 *               old_password: { type: string }
 *               new_password: { type: string }
 *     responses:
 *       200:
 *         description: Senha alterada
 */
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
