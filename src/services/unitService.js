const Unit = require('../models/Unit');
const Resident = require('../models/Resident');
const logger = require('../config/logger');

class UnitService {
  async list(condominiumId) {
    const units = await Unit.findAll({
      where: { condominium_id: condominiumId },
      include: [
        { model: Resident, as: 'residents', attributes: ['id', 'name', 'type', 'active'] }
      ],
      order: [['level1_value', 'ASC'], ['level2_value', 'ASC']]
    });
    return units;
  }

  async getById(condominiumId, unitId) {
    const unit = await Unit.findOne({
      where: { id: unitId, condominium_id: condominiumId },
      include: [
        { model: Resident, as: 'residents' }
      ]
    });

    if (!unit) {
      const error = new Error('Unidade nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    return unit;
  }

  async create(condominiumId, data) {
    const existing = await Unit.findOne({
      where: {
        condominium_id: condominiumId,
        level1_value: data.level1_value,
        level2_value: data.level2_value
      }
    });

    if (existing) {
      const error = new Error('Unidade ja existe neste condominio');
      error.statusCode = 409;
      throw error;
    }

    const unit = await Unit.create({
      ...data,
      condominium_id: condominiumId
    });

    logger.info({ msg: 'Unidade criada', unitId: unit.id, condominiumId });
    return unit;
  }

  async update(condominiumId, unitId, data) {
    const unit = await Unit.findOne({
      where: { id: unitId, condominium_id: condominiumId }
    });

    if (!unit) {
      const error = new Error('Unidade nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    await unit.update(data);

    logger.info({ msg: 'Unidade atualizada', unitId, condominiumId });
    return unit;
  }

  async delete(condominiumId, unitId) {
    const unit = await Unit.findOne({
      where: { id: unitId, condominium_id: condominiumId }
    });

    if (!unit) {
      const error = new Error('Unidade nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    const residentCount = await Resident.count({ where: { unit_id: unitId } });
    if (residentCount > 0) {
      const error = new Error('Nao e possivel excluir unidade com moradores vinculados');
      error.statusCode = 400;
      throw error;
    }

    await unit.destroy();

    logger.info({ msg: 'Unidade excluida', unitId, condominiumId });
    return { message: 'Unidade excluida com sucesso' };
  }
}

module.exports = new UnitService();
