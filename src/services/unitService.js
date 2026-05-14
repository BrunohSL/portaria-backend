const Unit = require('../models/Unit');
const Contact = require('../models/Contact');
const sequelize = require('../config/sequelize');
const logger = require('../config/logger');

class UnitService {
  async list(condominiumId) {
    const units = await Unit.findAll({
      where: { condominium_id: condominiumId },
      include: [
        { model: Contact, as: 'contacts', attributes: ['id', 'name', 'type', 'active'] }
      ],
      order: [['level1_value', 'ASC'], ['level2_value', 'ASC']]
    });
    return units;
  }

  async getById(condominiumId, unitId) {
    const unit = await Unit.findOne({
      where: { id: unitId, condominium_id: condominiumId },
      include: [
        { model: Contact, as: 'contacts' }
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

    const contactCount = await Contact.count({ where: { unit_id: unitId } });
    if (contactCount > 0) {
      const error = new Error('Nao e possivel excluir unidade com contatos vinculados');
      error.statusCode = 400;
      throw error;
    }

    await unit.destroy();

    logger.info({ msg: 'Unidade excluida', unitId, condominiumId });
    return { message: 'Unidade excluida com sucesso' };
  }

  async batchUpdate(condominiumId, updates) {
    const transaction = await sequelize.transaction();
    try {
      const results = [];
      for (const item of updates) {
        const unit = await Unit.findOne({
          where: { id: item.id, condominium_id: condominiumId },
          transaction
        });
        if (!unit) continue;

        const data = {};
        if (item.level1_value !== undefined) data.level1_value = item.level1_value;
        if (item.level2_value !== undefined) data.level2_value = item.level2_value;

        await unit.update(data, { transaction });
        results.push(unit);
      }
      await transaction.commit();
      logger.info({ msg: 'Unidades atualizadas em lote', count: results.length, condominiumId });
      return results;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async importCsv(condominiumId, rows) {
    const transaction = await sequelize.transaction();
    try {
      const created = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.level1_value || !row.level2_value) {
          errors.push({ line: i + 2, reason: 'Campos obrigatorios vazios' });
          continue;
        }

        const existing = await Unit.findOne({
          where: { condominium_id: condominiumId, level1_value: row.level1_value, level2_value: row.level2_value },
          transaction
        });

        if (existing) {
          errors.push({ line: i + 2, reason: `Unidade ${row.level1_value}/${row.level2_value} ja existe` });
          continue;
        }

        const unit = await Unit.create({
          condominium_id: condominiumId,
          level1_value: row.level1_value,
          level2_value: row.level2_value
        }, { transaction });

        created.push(unit);
      }

      await transaction.commit();
      logger.info({ msg: 'Import CSV concluido', created: created.length, errors: errors.length, condominiumId });
      return { created: created.length, errors };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new UnitService();
