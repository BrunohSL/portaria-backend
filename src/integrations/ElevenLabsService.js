const logger = require('../config/logger');
const { elevenlabs: elevenlabsConfig } = require('../config/env');
const { integrationErrors } = require('../config/metrics');

class ElevenLabsService {
  constructor() {
    this.apiKey = elevenlabsConfig.apiKey;
    this.defaultVoiceId = elevenlabsConfig.voiceId;
  }

  async textToSpeech(text, voiceId = null) {
    // TODO: Implementar TTS real via ElevenLabs API
    try {
      const voice = voiceId || this.defaultVoiceId;
      logger.info({ msg: '[MOCK] Gerando audio TTS', textLength: text?.length, voiceId: voice });
      return {
        audioBuffer: Buffer.from('mock-audio-data'),
        contentType: 'audio/mpeg',
        duration: text ? text.length * 0.05 : 0
      };
    } catch (error) {
      integrationErrors.inc({ integration: 'elevenlabs' });
      logger.error({ msg: 'Erro ElevenLabs TTS', error: error.message });
      throw error;
    }
  }
}

module.exports = new ElevenLabsService();
