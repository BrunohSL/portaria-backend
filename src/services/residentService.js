const Resident = require('../models/Resident');
const Unit = require('../models/Unit');
const logger = require('../config/logger');

class ResidentService {
  async list(condominiumId, filters = {}) {
    const where = { condominium_id: condominiumId };
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.type) where.type = filters.type;

    const residents = await Resident.findAll({
      where,
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'level1_value', 'level2_value'] }
      ],
      order: [['name', 'ASC']]
    });
    return residents;
  }

  async getById(condominiumId, residentId) {
    const resident = await Resident.findOne({
      where: { id: residentId, condominium_id: condominiumId },
      include: [
        { model: Unit, as: 'unit' }
      ]
    });

    if (!resident) {
      const error = new Error('Morador nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return resident;
  }

  async create(condominiumId, data) {
    if (data.unit_id) {
      const unit = await Unit.findOne({
        where: { id: data.unit_id, condominium_id: condominiumId }
      });
      if (!unit) {
        const error = new Error('Unidade nao encontrada neste condominio');
        error.statusCode = 400;
        throw error;
      }
      // Marcar unidade como ocupada
      if (unit.status === 'vacant') {
        await unit.update({ status: 'occupied' });
      }
    }

    const resident = await Resident.create({
      ...data,
      condominium_id: condominiumId
    });

    logger.info({ msg: 'Morador criado', residentId: resident.id, condominiumId });
    return resident;
  }

  async update(condominiumId, residentId, data) {
    const resident = await Resident.findOne({
      where: { id: residentId, condominium_id: condominiumId }
    });

    if (!resident) {
      const error = new Error('Morador nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.unit_id && data.unit_id !== resident.unit_id) {
      const unit = await Unit.findOne({
        where: { id: data.unit_id, condominium_id: condominiumId }
      });
      if (!unit) {
        const error = new Error('Unidade nao encontrada neste condominio');
        error.statusCode = 400;
        throw error;
      }
    }

    await resident.update(data);

    logger.info({ msg: 'Morador atualizado', residentId, condominiumId });
    return resident;
  }

  async delete(condominiumId, residentId) {
    const resident = await Resident.findOne({
      where: { id: residentId, condominium_id: condominiumId }
    });

    if (!resident) {
      const error = new Error('Morador nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await resident.destroy();

    // Verificar se unidade ficou vazia
    if (resident.unit_id) {
      const remaining = await Resident.count({ where: { unit_id: resident.unit_id } });
      if (remaining === 0) {
        await Unit.update({ status: 'vacant' }, { where: { id: resident.unit_id } });
      }
    }

    logger.info({ msg: 'Morador excluido', residentId, condominiumId });
    return { message: 'Morador excluido com sucesso' };
  }
}

module.exports = new ResidentService();
