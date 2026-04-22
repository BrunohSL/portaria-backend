const residentService = require('../services/residentService');

class ResidentController {
  async list(req, res) {
    try {
      const filters = {
        unit_id: req.query.unit_id,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        type: req.query.type
      };
      const residents = await residentService.list(req.params.id, filters);
      res.json({ success: true, data: residents });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const resident = await residentService.getById(req.params.id, req.params.residentId);
      res.json({ success: true, data: resident });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const resident = await residentService.create(req.params.id, req.body);
      res.status(201).json({ success: true, data: resident });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const resident = await residentService.update(req.params.id, req.params.residentId, req.body);
      res.json({ success: true, data: resident });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await residentService.delete(req.params.id, req.params.residentId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new ResidentController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller)
};
