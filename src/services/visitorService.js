const { Op } = require('sequelize');
const Visitor = require('../models/Visitor');
const UnitVisitor = require('../models/UnitVisitor');
const Unit = require('../models/Unit');
const sequelize = require('../config/sequelize');
const logger = require('../config/logger');

function normalizeName(name) {
  return (name || '').trim().toLowerCase();
}

class VisitorService {
  // Busca visitor já cadastrado em uma unidade pelo nome (case-insensitive).
  // Retorna o Visitor ou null.
  async findInUnit({ condominiumId, unitId, name }) {
    if (!unitId || !name) return null;
    const target = normalizeName(name);
    if (!target) return null;

    const visitors = await Visitor.findAll({
      where: { condominium_id: condominiumId },
      include: [{
        model: Unit,
        as: 'units',
        where: { id: unitId },
        required: true,
        through: { attributes: [] }
      }]
    });

    return visitors.find(v => normalizeName(v.name) === target) || null;
  }

  // Cadastra (ou reaproveita) visitor e garante vínculo com a unidade.
  // Roda em transação. Idempotente se chamado novamente com mesmo nome+unidade.
  async findOrCreateAndLink({ condominiumId, unitId, name, cpf, rg, phone }) {
    return sequelize.transaction(async (transaction) => {
      let visitor = await this.findInUnit({ condominiumId, unitId, name });

      if (!visitor) {
        visitor = await Visitor.create({
          condominium_id: condominiumId,
          name,
          cpf: cpf || null,
          rg: rg || null,
          phone: phone || null
        }, { transaction });

        await UnitVisitor.create({
          unit_id: unitId,
          visitor_id: visitor.id
        }, { transaction });

        logger.info({ msg: 'Visitor criado e vinculado à unidade', visitorId: visitor.id, unitId, condominiumId });
      } else {
        // Atualiza dados em branco se chegou info nova
        const updates = {};
        if (cpf && !visitor.cpf) updates.cpf = cpf;
        if (rg && !visitor.rg) updates.rg = rg;
        if (phone && !visitor.phone) updates.phone = phone;
        if (Object.keys(updates).length) {
          await visitor.update(updates, { transaction });
        }

        // Garante vínculo (caso visitor exista no condomínio mas não nessa unidade)
        const link = await UnitVisitor.findOne({
          where: { unit_id: unitId, visitor_id: visitor.id },
          paranoid: false,
          transaction
        });
        if (!link) {
          await UnitVisitor.create({
            unit_id: unitId,
            visitor_id: visitor.id
          }, { transaction });
        } else if (link.deleted_at) {
          await link.restore({ transaction });
        }
      }

      return visitor;
    });
  }

  // Visitor tem janela de autorização ativa agora?
  isAuthorizationActive(visitor, now = new Date()) {
    if (!visitor) return false;
    const from = visitor.authorized_from ? new Date(visitor.authorized_from) : null;
    const until = visitor.authorized_until ? new Date(visitor.authorized_until) : null;
    if (!from && !until) return false;
    if (from && now < from) return false;
    if (until && now > until) return false;
    return true;
  }
}

module.exports = new VisitorService();
