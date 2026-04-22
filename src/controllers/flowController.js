const flowService = require('../services/flowService');

class FlowController {
  async list(req, res) {
    try {
      const flows = await flowService.list(req.params.id);
      res.json({ success: true, data: flows });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const flow = await flowService.getById(req.params.id, req.params.flowId);
      res.json({ success: true, data: flow });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const flow = await flowService.create(req.params.id, req.body);
      res.status(201).json({ success: true, data: flow });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const flow = await flowService.update(req.params.id, req.params.flowId, req.body);
      res.json({ success: true, data: flow });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await flowService.delete(req.params.id, req.params.flowId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // Steps
  async listSteps(req, res) {
    try {
      const steps = await flowService.listSteps(req.params.id, req.params.flowId);
      res.json({ success: true, data: steps });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async createStep(req, res) {
    try {
      const step = await flowService.createStep(req.params.id, req.params.flowId, req.body);
      res.status(201).json({ success: true, data: step });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async updateStep(req, res) {
    try {
      const step = await flowService.updateStep(req.params.id, req.params.flowId, req.params.stepId, req.body);
      res.json({ success: true, data: step });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async deleteStep(req, res) {
    try {
      const result = await flowService.deleteStep(req.params.id, req.params.flowId, req.params.stepId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new FlowController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  listSteps: controller.listSteps.bind(controller),
  createStep: controller.createStep.bind(controller),
  updateStep: controller.updateStep.bind(controller),
  deleteStep: controller.deleteStep.bind(controller)
};
