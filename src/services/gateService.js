const Gate = require('../models/Gate');
const logger = require('../config/logger');

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

class GateService {
  async list(condominiumId) {
    return Gate.findAll({
      where: { condominium_id: condominiumId },
      order: [['position', 'ASC'], ['id', 'ASC']]
    });
  }

  async create(condominiumId, data) {
    const gate = await Gate.create({
      condominium_id: condominiumId,
      slug: data.slug,
      label: data.label,
      dns: data.dns ?? null,
      brand: data.brand ?? null,
      extension: data.extension ?? null,
      position: data.position ?? null,
      active: data.active ?? true
    });
    logger.info({ msg: 'Gate criado', gateId: gate.id, condominiumId });
    return gate;
  }

  async update(condominiumId, gateId, data) {
    const gate = await Gate.findOne({ where: { id: gateId, condominium_id: condominiumId } });
    if (!gate) throw notFound('Portão não encontrado');
    await gate.update(data);
    return gate;
  }

  async delete(condominiumId, gateId) {
    const gate = await Gate.findOne({ where: { id: gateId, condominium_id: condominiumId } });
    if (!gate) throw notFound('Portão não encontrado');
    await gate.destroy();
    return { message: 'Portão excluído com sucesso' };
  }
}

module.exports = new GateService();
