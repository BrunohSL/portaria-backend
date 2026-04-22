const crypto = require('crypto');

function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = id;
  res.set('X-Correlation-ID', id);
  next();
}

module.exports = correlationId;
