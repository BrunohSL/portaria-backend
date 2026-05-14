const userService = require('../services/userService');

class UserController {
  async list(req, res) {
    try {
      const caller = { role: req.userRole, condominiumId: req.condominiumId };
      const users = await userService.list(caller);
      res.json({ success: true, data: users });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const user = await userService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const caller = { userId: req.userId, role: req.userRole, condominiumId: req.condominiumId };
      const user = await userService.create(req.body, caller);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const caller = { userId: req.userId, role: req.userRole };
      const user = await userService.update(req.params.id, req.body, caller);
      res.json({ success: true, data: user });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await userService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const result = await userService.resetPassword(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async me(req, res) {
    try {
      const user = await userService.getById(req.userId);
      res.json({ success: true, data: { user } });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new UserController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  resetPassword: controller.resetPassword.bind(controller),
  me: controller.me.bind(controller)
};
