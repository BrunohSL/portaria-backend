const employeeShiftService = require('../services/employeeShiftService');

class EmployeeShiftController {
  async list(req, res) {
    try {
      const shifts = await employeeShiftService.list(req.params.id, req.params.employeeId);
      res.json({ success: true, data: shifts });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const shift = await employeeShiftService.create(req.params.id, req.params.employeeId, req.body);
      res.status(201).json({ success: true, data: shift });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await employeeShiftService.delete(req.params.id, req.params.employeeId, req.params.shiftId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new EmployeeShiftController();
module.exports = {
  list: controller.list.bind(controller),
  create: controller.create.bind(controller),
  delete: controller.delete.bind(controller)
};
