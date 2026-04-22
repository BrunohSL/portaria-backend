const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: 'Voce nao tem permissao para acessar este recurso'
      });
    }

    next();
  };
};

const checkCondominiumAccess = (req, res, next) => {
  const userRole = req.userRole;
  const userCondominiumId = req.condominiumId;
  const requestedCondominiumId = req.params.id || req.params.condominiumId || req.body.condominium_id || req.query.condominium_id;

  // ADM pode acessar qualquer condominio
  if (userRole === 'ADM') {
    return next();
  }

  // SUPPORT pode ler mas nao editar
  if (userRole === 'SUPPORT') {
    if (req.method === 'GET') {
      return next();
    }
    return res.status(403).json({ error: 'Suporte nao pode alterar dados' });
  }

  // CLIENT_ADM so pode acessar seu proprio condominio
  if (userRole === 'CLIENT_ADM' && userCondominiumId && requestedCondominiumId && userCondominiumId === requestedCondominiumId) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado a este condominio' });
};

module.exports = { checkRole, checkCondominiumAccess };
