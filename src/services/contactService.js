const Contact = require('../models/Contact');
const Unit = require('../models/Unit');
const sequelize = require('../config/sequelize');
const logger = require('../config/logger');

class ContactService {
  async list(condominiumId, filters = {}) {
    const where = { condominium_id: condominiumId };
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.type) where.type = filters.type;

    const contacts = await Contact.findAll({
      where,
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'level1_value', 'level2_value'] }
      ],
      order: [['name', 'ASC']]
    });
    return contacts;
  }

  async getById(condominiumId, contactId) {
    const contact = await Contact.findOne({
      where: { id: contactId, condominium_id: condominiumId },
      include: [{ model: Unit, as: 'unit' }]
    });

    if (!contact) {
      const error = new Error('Contato nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return contact;
  }

  async create(condominiumId, data) {
    if (data.unit_id) {
      const unit = await Unit.findOne({ where: { id: data.unit_id, condominium_id: condominiumId } });
      if (!unit) {
        const error = new Error('Unidade nao encontrada neste condominio');
        error.statusCode = 400;
        throw error;
      }
    }

    const contact = await Contact.create({
      ...data,
      condominium_id: condominiumId
    });

    logger.info({ msg: 'Contato criado', contactId: contact.id, condominiumId });
    return contact;
  }

  async update(condominiumId, contactId, data) {
    const contact = await Contact.findOne({ where: { id: contactId, condominium_id: condominiumId } });

    if (!contact) {
      const error = new Error('Contato nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.unit_id && data.unit_id !== contact.unit_id) {
      const unit = await Unit.findOne({ where: { id: data.unit_id, condominium_id: condominiumId } });
      if (!unit) {
        const error = new Error('Unidade nao encontrada neste condominio');
        error.statusCode = 400;
        throw error;
      }
    }

    await contact.update(data);

    logger.info({ msg: 'Contato atualizado', contactId, condominiumId });
    return contact;
  }

  async delete(condominiumId, contactId) {
    const contact = await Contact.findOne({ where: { id: contactId, condominium_id: condominiumId } });

    if (!contact) {
      const error = new Error('Contato nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await contact.destroy();

    logger.info({ msg: 'Contato excluido', contactId, condominiumId });
    return { message: 'Contato excluido com sucesso' };
  }

  async batchCreate(condominiumId, contacts) {
    const transaction = await sequelize.transaction();
    try {
      const created = [];
      const errors = [];

      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        if (!c.name || !c.unit_id || !c.type) {
          errors.push({ index: i, reason: 'Campos obrigatorios: name, unit_id, type' });
          continue;
        }

        const unit = await Unit.findOne({ where: { id: c.unit_id, condominium_id: condominiumId }, transaction });
        if (!unit) {
          errors.push({ index: i, reason: `Unidade ${c.unit_id} nao encontrada` });
          continue;
        }

        const contact = await Contact.create({
          condominium_id: condominiumId,
          unit_id: c.unit_id,
          name: c.name,
          type: c.type,
          phone: c.phone || null
        }, { transaction });

        created.push(contact);
      }

      await transaction.commit();
      logger.info({ msg: 'Contatos criados em lote', created: created.length, errors: errors.length, condominiumId });
      return { created: created.length, errors };
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
      const VALID_TYPES = ['owner', 'resident', 'visitor'];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;

        if (!row.level1_value || !row.level2_value || !row.name || !row.type) {
          errors.push({ line: lineNum, reason: 'Campos obrigatorios vazios (nivel1, nivel2, nome, tipo)' });
          continue;
        }

        const type = row.type.toLowerCase().trim();
        if (!VALID_TYPES.includes(type)) {
          errors.push({ line: lineNum, reason: `Tipo invalido "${row.type}" (use: owner, resident ou visitor)` });
          continue;
        }

        const unit = await Unit.findOne({
          where: {
            condominium_id: condominiumId,
            level1_value: row.level1_value,
            level2_value: row.level2_value
          },
          transaction
        });

        if (!unit) {
          errors.push({ line: lineNum, reason: `Unidade ${row.level1_value}/${row.level2_value} nao encontrada` });
          continue;
        }

        const contact = await Contact.create({
          condominium_id: condominiumId,
          unit_id: unit.id,
          name: row.name,
          phone: row.phone || null,
          type
        }, { transaction });

        created.push(contact);
      }

      await transaction.commit();
      logger.info({ msg: 'Contatos importados via CSV', created: created.length, errors: errors.length, condominiumId });
      return { created: created.length, errors };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async batchUpdate(condominiumId, updates) {
    const transaction = await sequelize.transaction();
    try {
      const results = [];
      for (const item of updates) {
        const contact = await Contact.findOne({ where: { id: item.id, condominium_id: condominiumId }, transaction });
        if (!contact) continue;

        const data = {};
        if (item.name !== undefined) data.name = item.name;
        if (item.unit_id !== undefined) data.unit_id = item.unit_id;
        if (item.type !== undefined) data.type = item.type;
        if (item.phone !== undefined) data.phone = item.phone || null;

        await contact.update(data, { transaction });
        results.push(contact);
      }
      await transaction.commit();
      logger.info({ msg: 'Contatos atualizados em lote', count: results.length, condominiumId });
      return results;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new ContactService();
