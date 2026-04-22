const callService = require('../services/callService');
const Condominium = require('../models/Condominium');
const { callQueue } = require('../config/queue');
const logger = require('../config/logger');

class CallController {
  // Webhook Twilio — sem auth JWT
  async incomingWebhook(req, res) {
    try {
      const { From: callerNumber, CallSid: callSid, To: toNumber } = req.body;

      // Identificar condominio pelo numero Twilio
      const condominium = await Condominium.findOne({
        where: { twilio_phone_number: toNumber, active: true }
      });

      if (!condominium) {
        logger.warn({ msg: 'Chamada para numero nao vinculado', toNumber, callerNumber });
        return res.type('text/xml').send(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Numero nao configurado.</Say><Hangup/></Response>'
        );
      }

      // Criar sessao e enfileirar
      const session = await callService.createSession(condominium.id, {
        caller_number: callerNumber,
        twilio_call_sid: callSid
      });

      await callQueue.add({
        sessionId: session.id,
        condominiumId: condominium.id,
        callerNumber,
        callSid
      });

      // Resposta inicial TwiML
      res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Aguarde um momento, estamos processando sua chamada.</Say><Pause length="2"/></Response>'
      );
    } catch (error) {
      logger.error({ msg: 'Erro no webhook de chamada', error: error.message });
      res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Desculpe, ocorreu um erro. Tente novamente mais tarde.</Say><Hangup/></Response>'
      );
    }
  }

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
  incomingWebhook: controller.incomingWebhook.bind(controller),
  listSessions: controller.listSessions.bind(controller),
  getSession: controller.getSession.bind(controller),
  getSessionLogs: controller.getSessionLogs.bind(controller)
};
