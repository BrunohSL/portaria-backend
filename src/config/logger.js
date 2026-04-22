const winston = require('winston');

const sensitiveFields = new Set([
  'password', 'new_password', 'old_password', 'token', 'bearertoken',
  'secret', 'authorization', 'api_key', 'apikey', 'accesstoken',
  'refreshtoken', 'cookie', 'twilio_auth_token', 'openai_api_key',
  'elevenlabs_api_key'
]);

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clean)) {
    if (sensitiveFields.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof clean[key] === 'object') {
      clean[key] = redact(clean[key]);
    }
  }
  return clean;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cca-api' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ]
});

logger.redact = redact;

module.exports = logger;
