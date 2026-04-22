const authService = require('../services/authService');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const result = await authService.changePassword(req.userId, old_password, new_password);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new AuthController();
module.exports = {
  login: controller.login.bind(controller),
  changePassword: controller.changePassword.bind(controller)
};
