const OpenAI = require('openai');
const logger = require('../config/logger');
const { openai: openaiConfig } = require('../config/env');
const { integrationErrors } = require('../config/metrics');
const {
  INTENT_CLASSIFICATION_SYSTEM,
  FIELD_EXTRACTION_SYSTEM,
  YES_NO_CLASSIFICATION_SYSTEM
} = require('../constants/prompts');

class OpenAIService {
  constructor() {
    this.apiKey = openaiConfig.apiKey;
    // Default trocado pra gpt-4o-mini (custo desprezível pra classificação/extração).
    // Pra mudar: env OPENAI_MODEL.
    this.model = openaiConfig.model || 'gpt-4o-mini';
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
  }

  isConfigured() {
    return !!this.client;
  }

  /**
   * Classifica a intenção do visitante dentro de um catálogo conhecido.
   * Usado pelo node COLETAR_INTENCAO. Mais robusto que keyword matching.
   *
   * @param {string} transcript - fala do visitante
   * @param {{ key: string, label: string }[]} intents - opções do catálogo + label descritiva
   * @returns {Promise<{ key: string, usage?: object }>} chave escolhida + token usage
   */
  async classifyIntent(transcript, intents) {
    if (!this.client) throw new Error('OPENAI_API_KEY não configurada');

    const intentsList = intents.map((i) => `- ${i.key}: ${i.label}`).join('\n');
    const systemPrompt = `${INTENT_CLASSIFICATION_SYSTEM}\n\nOpções disponíveis:\n${intentsList}\n- fallback: nenhuma das anteriores`;

    const startedAt = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: 20,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ]
      });
      const raw = (completion.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
      const validKeys = new Set([...intents.map((i) => i.key), 'fallback']);
      const key = validKeys.has(raw) ? raw : 'fallback';
      logger.info({ msg: '[OpenAI] classifyIntent ok', model: this.model, ms: Date.now() - startedAt, key });
      return { key, usage: completion.usage };
    } catch (err) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: '[OpenAI] erro em classifyIntent', error: err.message, ms: Date.now() - startedAt });
      throw err;
    }
  }

  /**
   * Extrai campos estruturados da fala do visitante.
   *
   * @param {string} transcript
   * @param {{ key: string, label: string, description?: string }[]} fields
   * @param {object} alreadyCollected - campos já coletados em turnos anteriores
   * @param {object} contextHints - dicas pra LLM (nomenclatura do condomínio, etc)
   * @returns {Promise<{ extracted: Record<string, string|null>, usage?: object }>}
   */
  async extractFields(transcript, fields, alreadyCollected = {}, contextHints = {}) {
    if (!this.client) throw new Error('OPENAI_API_KEY não configurada');

    const fieldsHelp = fields
      .map((f) => `- ${f.key}: ${f.label}${f.description ? ` (${f.description})` : ''}`)
      .join('\n');

    const properties = {};
    for (const f of fields) {
      properties[f.key] = { type: ['string', 'null'], description: f.label };
    }

    let systemPrompt = `${FIELD_EXTRACTION_SYSTEM}\n\nCampos a extrair:\n${fieldsHelp}`;
    if (contextHints.level1Label || contextHints.level2Label) {
      systemPrompt += `\n\nNomenclatura deste condomínio:`;
      if (contextHints.level1Label) systemPrompt += ` Nível 1 = "${contextHints.level1Label}"`;
      if (contextHints.level2Label) systemPrompt += `; Nível 2 = "${contextHints.level2Label}"`;
    }

    const userMessage = `Já coletado: ${JSON.stringify(alreadyCollected)}\nVisitante disse: "${transcript}"`;

    const startedAt = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: 200,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'extracted_fields',
            strict: true,
            schema: {
              type: 'object',
              properties,
              required: fields.map((f) => f.key),
              additionalProperties: false
            }
          }
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const extracted = JSON.parse(raw);

      // Defesa em profundidade: STT/LLM podem deixar pontuação ou espaços em
      // documentos. Garante storage limpo.
      for (const key of ['cpf', 'rg']) {
        if (extracted[key]) extracted[key] = String(extracted[key]).replace(/\D/g, '');
      }

      logger.info({ msg: '[OpenAI] extractFields ok', model: this.model, ms: Date.now() - startedAt, keys: Object.keys(extracted) });
      return { extracted, usage: completion.usage };
    } catch (err) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: '[OpenAI] erro em extractFields', error: err.message, ms: Date.now() - startedAt });
      throw err;
    }
  }

  /**
   * Classifica resposta como yes / no / unclear. Usado pra confirmação após
   * apresentar identificação ao visitante ("Você vai visitar o João?").
   */
  async classifyYesNo(transcript) {
    if (!this.client) throw new Error('OPENAI_API_KEY não configurada');

    const startedAt = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: 10,
        messages: [
          { role: 'system', content: YES_NO_CLASSIFICATION_SYSTEM },
          { role: 'user', content: transcript }
        ]
      });
      const raw = (completion.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
      const valid = new Set(['yes', 'no', 'unclear']);
      const key = valid.has(raw) ? raw : 'unclear';
      logger.info({ msg: '[OpenAI] classifyYesNo ok', model: this.model, ms: Date.now() - startedAt, key });
      return { key, usage: completion.usage };
    } catch (err) {
      integrationErrors.inc({ integration: 'openai' });
      logger.error({ msg: '[OpenAI] erro em classifyYesNo', error: err.message, ms: Date.now() - startedAt });
      throw err;
    }
  }

  // Métodos antigos (mocks legados — TODO: remover quando o resto do código
  // não chamar mais)

  async generateSummary(_transcript) {
    return '';
  }
}

module.exports = new OpenAIService();
