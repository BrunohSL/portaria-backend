const Employee = require('../models/Employee');
const EmployeeRole = require('../models/EmployeeRole');
const EmployeeShift = require('../models/EmployeeShift');
const sequelize = require('../config/sequelize');
const logger = require('../config/logger');

class EmployeeService {
  async list(condominiumId, filters = {}) {
    const where = { condominium_id: condominiumId };
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.role_id) where.role_id = filters.role_id;

    const employees = await Employee.findAll({
      where,
      include: [
        { model: EmployeeRole, as: 'role', attributes: ['id', 'key', 'label'] },
        { model: EmployeeShift, as: 'shifts' }
      ],
      order: [['name', 'ASC']]
    });
    return employees;
  }

  async getById(condominiumId, employeeId) {
    const employee = await Employee.findOne({
      where: { id: employeeId, condominium_id: condominiumId },
      include: [
        { model: EmployeeRole, as: 'role', attributes: ['id', 'key', 'label'] },
        { model: EmployeeShift, as: 'shifts' }
      ]
    });

    if (!employee) {
      const error = new Error('Funcionario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return employee;
  }

  async create(condominiumId, data) {
    if (!data.role_id) {
      const error = new Error('Cargo (role_id) obrigatorio');
      error.statusCode = 400;
      throw error;
    }

    const role = await EmployeeRole.findOne({ where: { id: data.role_id, active: true } });
    if (!role) {
      const error = new Error('Cargo nao encontrado ou inativo');
      error.statusCode = 400;
      throw error;
    }

    const employee = await Employee.create({
      condominium_id: condominiumId,
      role_id: data.role_id,
      name: data.name,
      phone: data.phone || null,
      can_authorize_access: data.can_authorize_access ?? false,
      emergency_active: data.emergency_active ?? false,
      emergency_phone: data.emergency_phone || null,
      active: data.active ?? true
    });

    logger.info({ msg: 'Funcionario criado', employeeId: employee.id, condominiumId });
    return this.getById(condominiumId, employee.id);
  }

  async update(condominiumId, employeeId, data) {
    const employee = await Employee.findOne({
      where: { id: employeeId, condominium_id: condominiumId }
    });

    if (!employee) {
      const error = new Error('Funcionario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.role_id && data.role_id !== employee.role_id) {
      const role = await EmployeeRole.findOne({ where: { id: data.role_id, active: true } });
      if (!role) {
        const error = new Error('Cargo nao encontrado ou inativo');
        error.statusCode = 400;
        throw error;
      }
    }

    await employee.update(data);

    logger.info({ msg: 'Funcionario atualizado', employeeId, condominiumId });
    return this.getById(condominiumId, employeeId);
  }

  async delete(condominiumId, employeeId) {
    const employee = await Employee.findOne({
      where: { id: employeeId, condominium_id: condominiumId }
    });

    if (!employee) {
      const error = new Error('Funcionario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await employee.destroy();

    logger.info({ msg: 'Funcionario excluido', employeeId, condominiumId });
    return { message: 'Funcionario excluido com sucesso' };
  }

  async listRoles({ activeOnly = true } = {}) {
    const where = activeOnly ? { active: true } : {};
    const roles = await EmployeeRole.findAll({ where, order: [['label', 'ASC']] });
    return roles;
  }

  async listRolesForCondominium(condominiumId) {
    // Retorna apenas os cargos que tÃªm pelo menos 1 funcionÃ¡rio atribuÃ­do
    // naquele condomÃ­nio. Usado pelo node CONTATAR (target=funcionario).
    const Employee = require('../models/Employee');
    const roles = await EmployeeRole.findAll({
      where: { active: true },
      include: [{
        model: Employee,
        as: 'employees',
        where: { condominium_id: condominiumId },
        required: true,
        attributes: []
      }],
      order: [['label', 'ASC']]
    });
    return roles;
  }

  async createRole(data) {
    if (!data.key || !data.label) {
      const error = new Error('Campos obrigatorios: key, label');
      error.statusCode = 400;
      throw error;
    }

    const existing = await EmployeeRole.findOne({ where: { key: data.key } });
    if (existing) {
      const error = new Error('Cargo com essa key ja existe');
      error.statusCode = 409;
      throw error;
    }

    const role = await EmployeeRole.create({
      key: data.key,
      label: data.label,
      active: data.active ?? true
    });

    logger.info({ msg: 'Cargo criado', roleId: role.id });
    return role;
  }

  async batchUpdate(condominiumId, updates) {
    const transaction = await sequelize.transaction();
    try {
      const results = [];
      for (const item of updates) {
        const employee = await Employee.findOne({
          where: { id: item.id, condominium_id: condominiumId },
          transaction
        });
        if (!employee) continue;

        const data = {};
        if (item.name !== undefined) data.name = item.name;
        if (item.phone !== undefined) data.phone = item.phone;
        if (item.role_id !== undefined) data.role_id = item.role_id;
        if (item.can_authorize_access !== undefined) data.can_authorize_access = item.can_authorize_access;
        if (item.emergency_active !== undefined) data.emergency_active = item.emergency_active;
        if (item.emergency_phone !== undefined) data.emergency_phone = item.emergency_phone;
        if (item.active !== undefined) data.active = item.active;

        await employee.update(data, { transaction });
        results.push(employee);
      }
      await transaction.commit();
      logger.info({ msg: 'Funcionarios atualizados em lote', count: results.length, condominiumId });
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

      // Cache dos roles disponiveis (key -> id)
      const roles = await EmployeeRole.findAll({ where: { active: true }, transaction });
      const roleByKey = new Map(roles.map((r) => [r.key.toLowerCase(), r]));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;

        if (!row.name || !row.role) {
          errors.push({ line: lineNum, reason: 'Campos obrigatorios vazios (nome, cargo)' });
          continue;
        }

        const roleKey = row.role.toLowerCase().trim();
        const role = roleByKey.get(roleKey);
        if (!role) {
          errors.push({ line: lineNum, reason: `Cargo "${row.role}" nao encontrado (use: ${[...roleByKey.keys()].join(', ')})` });
          continue;
        }

        const canAuthorize = ['true', '1', 'sim', 's', 'yes'].includes(String(row.can_authorize_access || '').toLowerCase().trim());

        const employee = await Employee.create({
          condominium_id: condominiumId,
          role_id: role.id,
          name: row.name,
          phone: row.phone || null,
          can_authorize_access: canAuthorize,
          active: true
        }, { transaction });

        created.push(employee);
      }

      await transaction.commit();
      logger.info({ msg: 'Funcionarios importados via CSV', created: created.length, errors: errors.length, condominiumId });
      return { created: created.length, errors };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new EmployeeService();
