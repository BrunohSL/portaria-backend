const logger = require('../config/logger');
const { twilio: twilioConfig } = require('../config/env');
const { integrationErrors } = require('../config/metrics');

class TwilioService {
  constructor() {
    this.accountSid = twilioConfig.accountSid;
    this.authToken = twilioConfig.authToken;
    this.phoneNumber = twilioConfig.phoneNumber;
  }

  async validateWebhook(req) {
    // TODO: Implementar validacao de assinatura Twilio
    logger.info({ msg: '[MOCK] Validando webhook Twilio' });
    return true;
  }

  async generateTwiML(options = {}) {
    // TODO: Implementar geracao de TwiML real
    logger.info({ msg: '[MOCK] Gerando TwiML', options });
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${options.message || 'Bem-vindo'}</Say></Response>`;
  }

  async transferCall(callSid, extension) {
    // TODO: Implementar transferencia real via Twilio API
    logger.info({ msg: '[MOCK] Transferindo chamada', callSid, extension });
    return { success: true, callSid, extension };
  }

  async endCall(callSid) {
    // TODO: Implementar encerramento real via Twilio API
    logger.info({ msg: '[MOCK] Encerrando chamada', callSid });
    return { success: true, callSid };
  }

  async transcribeAudio(audioUrl) {
    // TODO: Implementar STT real via Twilio ou Whisper
    try {
      logger.info({ msg: '[MOCK] Transcrevendo audio', audioUrl });
      return { text: '[MOCK] Transcricao do audio', confidence: 0.95 };
    } catch (error) {
      integrationErrors.inc({ integration: 'twilio' });
      logger.error({ msg: 'Erro ao transcrever audio', error: error.message });
      throw error;
    }
  }
}

module.exports = new TwilioService();
