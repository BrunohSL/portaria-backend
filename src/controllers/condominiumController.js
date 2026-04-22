const condominiumService = require('../services/condominiumService');

class CondominiumController {
  async list(req, res) {
    try {
      const condominiums = await condominiumService.list();
      res.json({ success: true, data: condominiums });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const condominium = await condominiumService.getById(req.params.id);
      res.json({ success: true, data: condominium });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const condominium = await condominiumService.create(req.body, req.userId);
      res.status(201).json({ success: true, data: condominium });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const condominium = await condominiumService.update(req.params.id, req.body);
      res.json({ success: true, data: condominium });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await condominiumService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new CondominiumController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller)
};
