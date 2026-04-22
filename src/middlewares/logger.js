const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const skipPaths = ['/health', '/metrics'];
    if (skipPaths.includes(req.path)) {
      return;
    }

    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      correlationId: req.correlationId
    });
  });

  next();
};

module.exports = requestLogger;
