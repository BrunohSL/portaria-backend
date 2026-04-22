const callService = require('../services/callService');
const flowService = require('../services/flowService');
const Flow = require('../models/Flow');
const FlowStep = require('../models/FlowStep');
const Condominium = require('../models/Condominium');
const twilioService = require('../integrations/TwilioService');
const openaiService = require('../integrations/OpenAIService');
const elevenlabsService = require('../integrations/ElevenLabsService');
const logger = require('../config/logger');

async function processCall(job) {
  const { sessionId, condominiumId, callerNumber, callSid } = job.data;

  logger.info({ msg: 'Processando chamada', sessionId, condominiumId, callerNumber });

  try {
    // 1. Atualizar status para in_progress
    await callService.updateSession(sessionId, { status: 'in_progress' });
    await callService.addLog(sessionId, condominiumId, 'call_started', null, { callerNumber, callSid });

    // 2. Buscar condominio e fluxo ativo
    const condominium = await Condominium.findByPk(condominiumId);
    if (!condominium) {
      throw new Error('Condominio nao encontrado');
    }

    // Buscar primeiro fluxo ativo (TODO: logica de selecao de fluxo mais inteligente)
    const flow = await Flow.findOne({
      where: { condominium_id: condominiumId, active: true },
      include: [{ model: FlowStep, as: 'steps', order: [['step_order', 'ASC']] }]
    });

    if (!flow || !flow.steps || flow.steps.length === 0) {
      logger.warn({ msg: 'Nenhum fluxo ativo encontrado', condominiumId });
      await callService.updateSession(sessionId, {
        status: 'failed',
        error_message: 'Nenhum fluxo ativo configurado'
      });
      await callService.addLog(sessionId, condominiumId, 'error', null, { reason: 'no_active_flow' });
      return;
    }

    await callService.updateSession(sessionId, { flow_id: flow.id });

    // 3. Executar steps sequencialmente
    for (const step of flow.steps) {
      await callService.updateSession(sessionId, { current_step_id: step.id });
      await callService.addLog(sessionId, condominiumId, 'step_started', step.id, { type: step.type, order: step.step_order });

      await executeStep(step, sessionId, condominiumId, condominium);

      await callService.addLog(sessionId, condominiumId, 'step_completed', step.id, { type: step.type });
    }

    // 4. Gerar resumo
    const summary = await openaiService.generateSummary('');
    await callService.updateSession(sessionId, { status: 'completed', summary });

    logger.info({ msg: 'Chamada processada com sucesso', sessionId });
  } catch (error) {
    logger.error({ msg: 'Erro ao processar chamada', sessionId, error: error.message });
    await callService.updateSession(sessionId, {
      status: 'failed',
      error_message: error.message
    });
    await callService.addLog(sessionId, condominiumId, 'error', null, { error: error.message });
    throw error;
  }
}

async function executeStep(step, sessionId, condominiumId, condominium) {
  const config = step.config || {};

  switch (step.type) {
    case 'GREETING': {
      const message = config.message || `Bem-vindo ao ${condominium.name}`;
      await elevenlabsService.textToSpeech(message);
      await twilioService.generateTwiML({ message });
      break;
    }

    case 'COLLECT_DATA': {
      // TODO: Implementar coleta de dados via STT + GPT
      logger.info({ msg: '[MOCK] Coletando dados', fields: config.fields });
      break;
    }

    case 'VALIDATE_RESIDENT': {
      // TODO: Implementar validacao de morador
      logger.info({ msg: '[MOCK] Validando morador' });
      break;
    }

    case 'ASK_QUESTION': {
      const question = config.question || 'Como posso ajudar?';
      await elevenlabsService.textToSpeech(question);
      // TODO: Aguardar resposta e interpretar
      break;
    }

    case 'OPEN_GATE': {
      // TODO: Implementar acionamento de portao via DNS/HTTP
      const gate = config.gate || 'gate1';
      logger.info({ msg: '[MOCK] Abrindo portao', gate, condominiumId });
      await callService.addLog(sessionId, condominiumId, 'gate_opened', step.id, { gate });
      break;
    }

    case 'TRANSFER_CALL': {
      const extension = config.extension || condominium.fallback_extension;
      if (extension) {
        await twilioService.transferCall(null, extension);
        await callService.updateSession(sessionId, { status: 'transferred' });
      }
      break;
    }

    case 'END_CALL': {
      const message = config.message || 'Atendimento encerrado. Obrigado.';
      await elevenlabsService.textToSpeech(message);
      await twilioService.endCall(null);
      break;
    }

    default:
      logger.warn({ msg: 'Tipo de step desconhecido', type: step.type });
  }
}

module.exports = processCall;
