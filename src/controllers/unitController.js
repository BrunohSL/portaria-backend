const unitService = require('../services/unitService');

class UnitController {
  async list(req, res) {
    try {
      const units = await unitService.list(req.params.id);
      res.json({ success: true, data: units });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const unit = await unitService.create(req.params.id, req.body);
      res.status(201).json({ success: true, data: unit });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const unit = await unitService.update(req.params.id, req.params.unitId, req.body);
      res.json({ success: true, data: unit });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await unitService.delete(req.params.id, req.params.unitId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new UnitController();
module.exports = {
  list: controller.list.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller)
};
