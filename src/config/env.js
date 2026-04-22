require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  process.stderr.write('FATAL: JWT_SECRET nao configurado em producao\n');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 3000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'cca',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root'
  },
  jwt: {
    secret: process.env.JWT_SECRET || (isProduction ? undefined : require('crypto').randomBytes(32).toString('hex')),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID
  },
  callQueueConcurrency: parseInt(process.env.CALL_QUEUE_CONCURRENCY) || 5
};
