const employeeService = require('../services/employeeService');

class EmployeeController {
  async list(req, res) {
    try {
      const filters = {
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        role_id: req.query.role_id ? parseInt(req.query.role_id) : undefined
      };
      const employees = await employeeService.list(req.params.id, filters);
      res.json({ success: true, data: employees });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const employee = await employeeService.getById(req.params.id, req.params.employeeId);
      res.json({ success: true, data: employee });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const employee = await employeeService.create(req.params.id, req.body);
      res.status(201).json({ success: true, data: employee });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const employee = await employeeService.update(req.params.id, req.params.employeeId, req.body);
      res.json({ success: true, data: employee });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await employeeService.delete(req.params.id, req.params.employeeId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async listRoles(req, res) {
    try {
      const activeOnly = req.query.active !== 'false';
      const roles = await employeeService.listRoles({ activeOnly });
      res.json({ success: true, data: roles });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async listRolesForCondominium(req, res) {
    try {
      const roles = await employeeService.listRolesForCondominium(req.params.id);
      res.json({ success: true, data: roles });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async createRole(req, res) {
    try {
      const role = await employeeService.createRole(req.body);
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async batchUpdate(req, res) {
    try {
      const results = await employeeService.batchUpdate(req.params.id, req.body.employees);
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
      const result = await employeeService.importCsv(req.params.id, rows);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new EmployeeController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  listRoles: controller.listRoles.bind(controller),
  listRolesForCondominium: controller.listRolesForCondominium.bind(controller),
  createRole: controller.createRole.bind(controller),
  batchUpdate: controller.batchUpdate.bind(controller),
  importCsv: controller.importCsv.bind(controller)
};
