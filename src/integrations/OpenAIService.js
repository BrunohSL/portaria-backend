const logger = require('../config/logger');
const { openai: openaiConfig } = require('../config/env');
const { integrationErrors } = require('../config/metrics');

class OpenAIService {
  constructor() {
    this.apiKey = openaiConfig.apiKey;
    this.model = openaiConfig.model;
  }

  async interpretInput(text, context = {}) {
    // TODO: Implementar chamada real para OpenAI GPT
    try {
      logger.info({ msg: '[MOCK] Interpretando input via GPT', textLength: text?.length, model: this.model });
      return {
        intent: 'visit',
        entities: {},
        response: '[MOCK] Entendido. Vou verificar para voce.',
        confidence: 0.85
      };
    } catch (error) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: 'Erro OpenAI', error: error.message });
      throw error;
    }
  }

  async extractFields(text, fields = []) {
    // TODO: Implementar extracao estruturada real
    try {
      logger.info({ msg: '[MOCK] Extraindo campos via GPT', fields, textLength: text?.length });
      const extracted = {};
      fields.forEach(f => { extracted[f] = null; });
      return extracted;
    } catch (error) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: 'Erro ao extrair campos', error: error.message });
      throw error;
    }
  }

  async generateResponse(prompt, systemContext = '') {
    // TODO: Implementar geracao de resposta real
    try {
      logger.info({ msg: '[MOCK] Gerando resposta GPT', promptLength: prompt?.length });
      return '[MOCK] Resposta gerada pela IA';
    } catch (error) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: 'Erro ao gerar resposta', error: error.message });
      throw error;
    }
  }

  async generateSummary(transcript) {
    // TODO: Implementar resumo real da chamada
    try {
      logger.info({ msg: '[MOCK] Gerando resumo da chamada' });
      return '[MOCK] Resumo da chamada gerado pela IA';
    } catch (error) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: 'Erro ao gerar resumo', error: error.message });
      throw error;
    }
  }
}

module.exports = new OpenAIService();
