const Condominium = require('../models/Condominium');
const Unit = require('../models/Unit');
const Resident = require('../models/Resident');
const logger = require('../config/logger');

class CondominiumService {
  async list() {
    const condominiums = await Condominium.findAll({
      order: [['name', 'ASC']]
    });
    return condominiums;
  }

  async getById(id) {
    const condominium = await Condominium.findByPk(id, {
      include: [
        { model: Unit, as: 'units', attributes: ['id', 'level1_value', 'level2_value', 'status'] }
      ]
    });

    if (!condominium) {
      const error = new Error('Condominio nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return condominium;
  }

  async create(data, callerId) {
    const condominium = await Condominium.create({
      ...data,
      created_by: callerId
    });

    logger.info({ msg: 'Condominio criado', condominiumId: condominium.id });
    return condominium;
  }

  async update(id, data) {
    const condominium = await Condominium.findByPk(id);

    if (!condominium) {
      const error = new Error('Condominio nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await condominium.update(data);

    logger.info({ msg: 'Condominio atualizado', condominiumId: id });
    return condominium;
  }

  async delete(id) {
    const condominium = await Condominium.findByPk(id);

    if (!condominium) {
      const error = new Error('Condominio nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Verificar dependencias
    const unitCount = await Unit.count({ where: { condominium_id: id } });
    if (unitCount > 0) {
      const error = new Error('Nao e possivel excluir condominio com unidades vinculadas');
      error.statusCode = 400;
      throw error;
    }

    await condominium.destroy();

    logger.info({ msg: 'Condominio excluido', condominiumId: id });
    return { message: 'Condominio excluido com sucesso' };
  }
}

module.exports = new CondominiumService();
