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

// Formatter de dev: surface `msg` (convenção do projeto) + meta inline.
// Quando logger.info({msg, ...}) é chamado com objeto puro, o winston empacota
// o objeto inteiro em `info.message`. Aqui desempacotamos pra exibir bonito.
const devPretty = winston.format.printf((info) => {
  const { level, timestamp, message, service, stack, ...rest } = info;

  let head = '';
  let meta = { ...rest };
  if (message && typeof message === 'object') {
    const { msg, ...others } = message;
    head = msg || '';
    meta = { ...others, ...rest };
  } else {
    head = message || '';
  }

  const metaKeys = Object.keys(meta);
  const metaStr = metaKeys.length ? ' ' + JSON.stringify(meta) : '';
  const tail = stack ? `\n${stack}` : '';
  return `${timestamp} ${level}: ${head}${metaStr}${tail}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'portaria-api' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            devPretty
          )
    })
  ]
});

logger.redact = redact;

module.exports = logger;
