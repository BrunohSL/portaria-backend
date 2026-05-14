const User = require('../models/User');
const Condominium = require('../models/Condominium');
const { generateSecurePassword } = require('../lib/crypto');
const logger = require('../config/logger');

class UserService {
  async list(caller) {
    const where = {};
    if (caller.role === 'CLIENT_ADM') {
      where.condominium_id = caller.condominiumId;
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Condominium, as: 'condominium', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
    return users;
  }

  async getById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Condominium, as: 'condominium', attributes: ['id', 'name'] }]
    });

    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  async create(data, caller) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      const error = new Error('Email ja cadastrado');
      error.statusCode = 409;
      throw error;
    }

    if (caller.role === 'CLIENT_ADM') {
      data.role = 'CLIENT_ADM';
      data.condominium_id = caller.condominiumId;
    }

    if ((data.role === 'CLIENT_ADM') && !data.condominium_id) {
      const error = new Error('condominium_id obrigatorio para CLIENT_ADM');
      error.statusCode = 400;
      throw error;
    }

    const tempPassword = generateSecurePassword();

    const user = await User.create({
      name: data.name,
      email: data.email,
      password_hash: tempPassword,
      role: data.role,
      condominium_id: data.condominium_id || null,
      first_access: true,
      created_by: caller.userId
    });

    logger.info({ msg: 'Usuario criado', userId: user.id, role: data.role });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      condominium_id: user.condominium_id,
      first_access: user.first_access,
      temp_password: tempPassword
    };
  }

  async update(id, data, caller) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ where: { email: data.email } });
      if (existing) {
        const error = new Error('Email ja cadastrado');
        error.statusCode = 409;
        throw error;
      }
    }

    const allowed = ['name', 'email', 'role', 'condominium_id', 'active'];
    const updateData = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    await user.update(updateData);

    logger.info({ msg: 'Usuario atualizado', userId: id });
    return await this.getById(id);
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await user.destroy();
    logger.info({ msg: 'Usuario excluido', userId: id });
    return { message: 'Usuario excluido com sucesso' };
  }

  async resetPassword(id) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    const tempPassword = generateSecurePassword();
    user.password_hash = tempPassword;
    user.first_access = true;
    await user.save();

    logger.info({ msg: 'Senha resetada', userId: id });
    return { message: 'Senha resetada com sucesso', temp_password: tempPassword };
  }
}

module.exports = new UserService();
