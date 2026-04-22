const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');
const { Op } = require('sequelize');

class AuditService {
  async log(data) {
    try {
      await AuditLog.create(data);
    } catch (error) {
      logger.error({ msg: 'Erro ao gravar log de auditoria', error: error.message });
    }
  }

  async list(filters = {}) {
    const where = {};

    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) where.created_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.created_at[Op.lte] = new Date(filters.to);
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });

    return logs;
  }
}

module.exports = new AuditService();
