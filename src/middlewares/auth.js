const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token invalido' });
      }

      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
      req.condominiumId = decoded.condominium_id;
      req.firstAccess = decoded.first_access;

      return next();
    });
  } catch (error) {
    return res.status(401).json({ error: 'Erro na autenticacao' });
  }
};

const checkFirstAccess = (req, res, next) => {
  if (req.firstAccess) {
    return res.status(403).json({
      error: 'Primeiro acesso detectado. Redefina sua senha antes de continuar.',
      requirePasswordChange: true
    });
  }
  next();
};

module.exports = { authMiddleware, checkFirstAccess };
