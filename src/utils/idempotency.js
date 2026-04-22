const ProcessedEvent = require('../models/ProcessedEvent');
const logger = require('../config/logger');

const REDIS_TTL = 86400; // 24 horas

class IdempotencyChecker {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async isDuplicate(externalId, source = 'twilio') {
    const redisKey = `event:${externalId}`;

    // 1. Verificar Redis
    if (this.redis) {
      try {
        const exists = await this.redis.get(redisKey);
        if (exists) {
          logger.info({ msg: 'Evento duplicado (Redis)', externalId });
          return true;
        }
      } catch (error) {
        logger.warn({ msg: 'Erro ao verificar Redis para idempotencia', error: error.message });
      }
    }

    // 2. Fallback: verificar MySQL
    const existing = await ProcessedEvent.findOne({ where: { external_id: externalId } });
    if (existing) {
      // Re-popular Redis se disponivel
      if (this.redis) {
        try {
          await this.redis.set(redisKey, '1', 'EX', REDIS_TTL);
        } catch { /* ignore */ }
      }
      logger.info({ msg: 'Evento duplicado (MySQL)', externalId });
      return true;
    }

    return false;
  }

  async markProcessed(externalId, source = 'twilio') {
    const redisKey = `event:${externalId}`;

    // Registrar em MySQL
    await ProcessedEvent.create({
      external_id: externalId,
      source,
      processed_at: new Date()
    });

    // Registrar em Redis
    if (this.redis) {
      try {
        await this.redis.set(redisKey, '1', 'EX', REDIS_TTL);
      } catch { /* ignore */ }
    }
  }
}

module.exports = IdempotencyChecker;
