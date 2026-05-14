// Cliente HTTP fininho pra API REST da Twilio. Evita a dep `twilio` SDK.
// Doc: https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource

const axios = require('axios');
const { twilio: twilioConfig } = require('../../config/env');
const logger = require('../../config/logger');

// Credenciais globais. O número de origem (From) é por condomínio, vindo da
// tabela phone_numbers. `TWILIO_PHONE_NUMBER` no .env serve só como fallback
// pra testes locais quando o condomínio não tem número configurado.
function isConfigured() {
  return !!(twilioConfig.accountSid && twilioConfig.authToken);
}

function basicAuth() {
  const token = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64');
  return `Basic ${token}`;
}

function callsUrl() {
  return `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Calls.json`;
}

// Cria uma chamada outbound. `params` segue os nomes da API Twilio (PascalCase).
// Retorna o body parseado da resposta. Lança em erro HTTP.
async function createCall(params) {
  if (!isConfigured()) {
    throw new Error('Twilio não configurado (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER)');
  }

  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) body.append(k, String(v));
  }

  try {
    const res = await axios.post(callsUrl(), body, {
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10_000
    });
    return res.data;
  } catch (err) {
    const data = err.response?.data;
    logger.error({ msg: '[twilioClient] erro criando call', status: err.response?.status, data, error: err.message });
    const e = new Error(data?.message || err.message);
    e.code = data?.code;
    e.status = err.response?.status;
    throw e;
  }
}

module.exports = {
  isConfigured,
  createCall,
  fromNumber: () => twilioConfig.phoneNumber
};
