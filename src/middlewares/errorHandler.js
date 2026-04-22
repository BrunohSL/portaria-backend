const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor' : err.message;

  logger.error({
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode,
    correlationId: req.correlationId
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
