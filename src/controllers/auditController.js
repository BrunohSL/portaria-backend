const auditService = require('../services/auditService');

class AuditController {
  async list(req, res) {
    try {
      const filters = {
        user_id: req.query.user_id,
        action: req.query.action,
        resource: req.query.resource,
        from: req.query.from,
        to: req.query.to,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0
      };

      const logs = await auditService.list(filters);
      res.json({ success: true, data: logs });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new AuditController();
module.exports = {
  list: controller.list.bind(controller)
};
