const CallSession = require('../models/CallSession');
const CallLog = require('../models/CallLog');
const Condominium = require('../models/Condominium');
const Flow = require('../models/Flow');
const FlowStep = require('../models/FlowStep');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { activeCalls, callsTotal, callDuration } = require('../config/metrics');

class CallService {
  async createSession(condominiumId, data) {
    const condominium = await Condominium.findByPk(condominiumId);
    if (!condominium || !condominium.active) {
      const error = new Error('Condominio nao encontrado ou inativo');
      error.statusCode = 404;
      throw error;
    }

    const session = await CallSession.create({
      condominium_id: condominiumId,
      caller_number: data.caller_number,
      twilio_call_sid: data.twilio_call_sid,
      status: 'queued',
      started_at: new Date()
    });

    activeCalls.inc();

    logger.info({ msg: 'Sessao de chamada criada', sessionId: session.id, condominiumId });
    return session;
  }

  async updateSession(sessionId, data) {
    const session = await CallSession.findByPk(sessionId);
    if (!session) {
      const error = new Error('Sessao nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    await session.update(data);

    // Se encerrou a chamada, calcular duracao e atualizar metricas
    if (data.status && ['completed', 'failed', 'transferred', 'abandoned'].includes(data.status)) {
      const duration = session.started_at ? Math.round((new Date() - new Date(session.started_at)) / 1000) : null;

      await session.update({
        ended_at: new Date(),
        duration_seconds: duration
      });

      activeCalls.dec();
      callsTotal.inc({ condominium_id: session.condominium_id, status: data.status });
      if (duration) {
        callDuration.observe({ condominium_id: session.condominium_id }, duration);
      }
    }

    return session;
  }

  async addLog(sessionId, condominiumId, eventType, stepId, payload) {
    const log = await CallLog.create({
      call_session_id: sessionId,
      condominium_id: condominiumId,
      event_type: eventType,
      step_id: stepId || null,
      payload: payload || null
    });

    return log;
  }

  async getSessions(condominiumId, filters = {}) {
    const where = { condominium_id: condominiumId };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.started_at = {};
      if (filters.from) where.started_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.started_at[Op.lte] = new Date(filters.to);
    }

    const sessions = await CallSession.findAll({
      where,
      include: [
        { model: Flow, as: 'flow', attributes: ['id', 'name', 'type'] },
        { model: FlowStep, as: 'currentStep', attributes: ['id', 'type', 'step_order'] }
      ],
      order: [['started_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });

    return sessions;
  }

  async getSessionById(sessionId, condominiumId) {
    const where = { id: sessionId };
    if (condominiumId) where.condominium_id = condominiumId;

    const session = await CallSession.findOne({
      where,
      include: [
        { model: Flow, as: 'flow' },
        { model: FlowStep, as: 'currentStep' },
        { model: Condominium, as: 'condominium', attributes: ['id', 'name'] }
      ]
    });

    if (!session) {
      const error = new Error('Sessao nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    return session;
  }

  async getSessionLogs(sessionId, condominiumId) {
    const where = { call_session_id: sessionId };
    if (condominiumId) where.condominium_id = condominiumId;

    const logs = await CallLog.findAll({
      where,
      include: [
        { model: FlowStep, as: 'step', attributes: ['id', 'type', 'step_order'] }
      ],
      order: [['created_at', 'ASC']]
    });

    return logs;
  }
}

module.exports = new CallService();
