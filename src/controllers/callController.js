const callService = require('../services/callService');

class CallController {
  async listSessions(req, res) {
    try {
      const condominiumId = req.userRole === 'ADM' ? req.query.condominium_id : req.condominiumId;

      if (!condominiumId) {
        return res.status(400).json({ success: false, error: 'condominium_id obrigatorio' });
      }

      const filters = {
        status: req.query.status,
        from: req.query.from,
        to: req.query.to,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const sessions = await callService.getSessions(condominiumId, filters);
      res.json({ success: true, data: sessions });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getSession(req, res) {
    try {
      const condominiumId = req.userRole === 'ADM' ? null : req.condominiumId;
      const session = await callService.getSessionById(req.params.id, condominiumId);
      res.json({ success: true, data: session });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getSessionLogs(req, res) {
    try {
      const condominiumId = req.userRole === 'ADM' ? null : req.condominiumId;
      const logs = await callService.getSessionLogs(req.params.id, condominiumId);
      res.json({ success: true, data: logs });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new CallController();
module.exports = {
  listSessions: controller.listSessions.bind(controller),
  getSession: controller.getSession.bind(controller),
  getSessionLogs: controller.getSessionLogs.bind(controller)
};
