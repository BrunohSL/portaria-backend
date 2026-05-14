const contactService = require('../services/contactService');

class ContactController {
  async list(req, res) {
    try {
      const filters = {
        unit_id: req.query.unit_id,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        type: req.query.type
      };
      const contacts = await contactService.list(req.params.id, filters);
      res.json({ success: true, data: contacts });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const contact = await contactService.getById(req.params.id, req.params.contactId);
      res.json({ success: true, data: contact });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const contact = await contactService.create(req.params.id, req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const contact = await contactService.update(req.params.id, req.params.contactId, req.body);
      res.json({ success: true, data: contact });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await contactService.delete(req.params.id, req.params.contactId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async batchCreate(req, res) {
    try {
      const result = await contactService.batchCreate(req.params.id, req.body.contacts);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async batchUpdate(req, res) {
    try {
      const results = await contactService.batchUpdate(req.params.id, req.body.contacts);
      res.json({ success: true, data: { updated: results.length } });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async importCsv(req, res) {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ success: false, error: 'Campo rows obrigatorio (array)' });
      }
      const result = await contactService.importCsv(req.params.id, rows);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new ContactController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  batchCreate: controller.batchCreate.bind(controller),
  batchUpdate: controller.batchUpdate.bind(controller),
  importCsv: controller.importCsv.bind(controller)
};
