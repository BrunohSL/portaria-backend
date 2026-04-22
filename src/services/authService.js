const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const User = require('../models/User');
const logger = require('../config/logger');

class AuthService {
  async login(email, password) {
    const user = await User.findOne({ where: { email, active: true } });

    if (!user) {
      const error = new Error('Credenciais invalidas');
      error.statusCode = 401;
      throw error;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      const error = new Error('Credenciais invalidas');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        condominium_id: user.condominium_id,
        first_access: user.first_access
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    logger.info({ msg: 'Login realizado', userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        condominium_id: user.condominium_id,
        first_access: user.first_access
      }
    };
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (!user.first_access) {
      const isValid = await user.comparePassword(oldPassword);
      if (!isValid) {
        const error = new Error('Senha atual incorreta');
        error.statusCode = 400;
        throw error;
      }
    }

    user.password_hash = newPassword;
    user.first_access = false;
    await user.save();

    logger.info({ msg: 'Senha alterada', userId: user.id });

    return { message: 'Senha alterada com sucesso' };
  }
}

module.exports = new AuthService();
