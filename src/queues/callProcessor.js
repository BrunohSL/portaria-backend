const callService = require('../services/callService');
const Flow = require('../models/Flow');
const FlowNode = require('../models/FlowNode');
const FlowEdge = require('../models/FlowEdge');
const Condominium = require('../models/Condominium');
const Gate = require('../models/Gate');
const Extension = require('../models/Extension');
const twilioService = require('../integrations/TwilioService');
const openaiService = require('../integrations/OpenAIService');
const elevenlabsService = require('../integrations/ElevenLabsService');
const { getCatalog } = require('../constants/intentCatalogs');
const logger = require('../config/logger');

const MAX_NODES_PER_CALL = 100;
const MAX_FLOW_TRANSFERS_PER_CALL = 3;

async function processCall(job) {
  const { sessionId, condominiumId, callerNumber, callSid } = job.data;

  logger.info({ msg: 'Processando chamada', sessionId, condominiumId, callerNumber });

  try {
    await callService.updateSession(sessionId, { status: 'in_progress' });
    await callService.addLog(sessionId, condominiumId, 'call_started', null, { callerNumber, callSid });

    const condominium = await Condominium.findByPk(condominiumId);
    if (!condominium) throw new Error('Condominio nao encontrado');

    // Toda chamada começa pelo fluxo ROOT do condomínio.
    let activeFlow = await loadFlowWithGraph({ condominium_id: condominiumId, type: 'ROOT', active: true });

    if (!activeFlow || !activeFlow.entry_node_id) {
      logger.warn({ msg: 'Fluxo ROOT não configurado ou sem entry_node', condominiumId });
      await callService.updateSession(sessionId, {
        status: 'failed',
        error_message: 'Fluxo de identificação de intenção não configurado'
      });
      await callService.addLog(sessionId, condominiumId, 'error', null, { reason: 'no_root_flow' });
      return;
    }

    await callService.updateSession(sessionId, { flow_id: activeFlow.id });

    let { nodesById, edgesBySource } = indexFlow(activeFlow);
    const ctx = { sessionId, condominiumId, condominium, callSid, collectedData: {} };
    let currentNode = nodesById.get(activeFlow.entry_node_id);
    let visited = 0;
    let transfers = 0;

    while (currentNode && visited < MAX_NODES_PER_CALL) {
      visited += 1;
      await callService.updateSession(sessionId, { current_node_id: currentNode.id });
      await callService.addLog(sessionId, condominiumId, 'node_started', currentNode.id, { type: currentNode.type });

      const result = await executeNode(currentNode, ctx);

      await callService.addLog(sessionId, condominiumId, 'node_completed', currentNode.id, {
        type: currentNode.type,
        outputHandle: result.outputHandle
      });

      // Cross-flow transfer
      if (result.transferTo) {
        transfers += 1;
        if (transfers > MAX_FLOW_TRANSFERS_PER_CALL) {
          logger.warn({ msg: 'Limite de transferências entre fluxos atingido', sessionId, transfers });
          break;
        }
        const targetFlow = await loadFlowWithGraph({ id: result.transferTo.flowId, condominium_id: condominiumId });
        if (!targetFlow || !targetFlow.entry_node_id) {
          logger.warn({ msg: 'Fluxo destino inválido', flowId: result.transferTo.flowId });
          break;
        }
        activeFlow = targetFlow;
        ({ nodesById, edgesBySource } = indexFlow(activeFlow));
        await callService.updateSession(sessionId, { flow_id: activeFlow.id });
        await callService.addLog(sessionId, condominiumId, 'flow_transferred', null, {
          fromFlowId: ctx.fromFlowId, toFlowId: activeFlow.id, toFlowType: activeFlow.type
        });
        currentNode = nodesById.get(activeFlow.entry_node_id);
        continue;
      }

      const nextEdge = edgesBySource.get(`${currentNode.id}:${result.outputHandle}`);
      currentNode = nextEdge ? nodesById.get(nextEdge.target_node_id) : null;
    }

    if (visited >= MAX_NODES_PER_CALL) {
      logger.warn({ msg: 'Limite de nodes por chamada atingido', sessionId, visited });
      await callService.addLog(sessionId, condominiumId, 'warning', null, { reason: 'max_nodes_reached' });
    }

    const summary = await openaiService.generateSummary('');
    await callService.updateSession(sessionId, { status: 'completed', summary });

    logger.info({ msg: 'Chamada processada com sucesso', sessionId, visited });
  } catch (error) {
    logger.error({ msg: 'Erro ao processar chamada', sessionId, error: error.message });
    await callService.updateSession(sessionId, { status: 'failed', error_message: error.message });
    await callService.addLog(sessionId, condominiumId, 'error', null, { error: error.message });
    throw error;
  }
}

// ===========================
// Helpers de carregamento
// ===========================

async function loadFlowWithGraph(where) {
  return Flow.findOne({
    where,
    include: [
      { model: FlowNode, as: 'nodes' },
      { model: FlowEdge, as: 'edges' }
    ]
  });
}

function indexFlow(flow) {
  const nodesById = new Map((flow.nodes ?? []).map((n) => [n.id, n]));
  const edgesBySource = new Map();
  for (const e of flow.edges ?? []) {
    edgesBySource.set(`${e.source_node_id}:${e.source_handle}`, e);
  }
  return { nodesById, edgesBySource };
}

// ===========================
// Handlers por tipo de node
// ===========================
// Por enquanto a maioria são placeholders que apenas logam o que fariam e
// devolvem 'default' como handle de saída. A execução real (LLM, STT,
// chamadas Twilio/portões etc) entra conforme cada node for implementado.

async function executeNode(node, ctx) {
  const config = node.config || {};

  switch (node.type) {
    case 'TIMER': {
      const seconds = Number(config.durationSeconds ?? 0);
      logger.info({ msg: '[node:TIMER] aguardando', seconds });
      await new Promise((r) => setTimeout(r, Math.max(0, seconds) * 1000));
      return { outputHandle: 'default' };
    }

    case 'COMUNICACAO': {
      const text = config.text ?? '';
      if (config.mode === 'llm') {
        // TODO: rotear pelo LLM com o texto como prompt + histórico da conversa
        logger.info({ msg: '[node:COMUNICACAO] modo LLM (TODO)', textLen: text.length });
      } else {
        await elevenlabsService.textToSpeech(text);
        await twilioService.generateTwiML({ message: text });
      }
      return { outputHandle: 'default' };
    }

    case 'COMANDO': {
      if (config.command === 'open_gate') {
        const gate = config.gateId
          ? await Gate.findOne({ where: { id: config.gateId, condominium_id: ctx.condominiumId } })
          : null;
        // TODO: acionar portão via DNS/HTTP usando gate.dns
        logger.info({ msg: '[node:COMANDO] abrindo portão (mock)', gate: gate?.slug ?? config.gateId });
        await callService.addLog(ctx.sessionId, ctx.condominiumId, 'gate_opened', node.id, {
          gateId: gate?.id, slug: gate?.slug
        });
      } else {
        logger.warn({ msg: '[node:COMANDO] comando desconhecido', command: config.command });
      }
      return { outputHandle: 'default' };
    }

    case 'COLETAR_DADOS_MORADOR': {
      // TODO: loop com STT + LLM até coletar todos os campos em config.requestedFields,
      // depois buscar morador no condomínio (Contact + Unit) e ramificar.
      logger.info({ msg: '[node:COLETAR_DADOS_MORADOR] coletando (mock)', fields: config.requestedFields });
      // Mock: assume sempre 'dadosConfirmados' por enquanto pra fluir o teste
      return { outputHandle: 'dadosConfirmados' };
    }

    case 'COLETAR_DADOS_VISITA': {
      // TODO: loop com STT + LLM até coletar todos os campos. Cadastra visitante novo se necessário.
      logger.info({ msg: '[node:COLETAR_DADOS_VISITA] coletando (mock)', fields: config.requestedFields });
      return { outputHandle: 'default' };
    }

    case 'CONTATAR': {
      // TODO: dial via Twilio (interfone/telefone/whatsapp), espera resposta, classifica.
      logger.info({ msg: '[node:CONTATAR] contatando (mock)', target: config.target, channel: config.channel });
      // Mock: assume sempre 'autorizado' por enquanto
      return { outputHandle: 'autorizado' };
    }

    case 'COLETAR_INTENCAO': {
      const catalog = getCatalog(config.catalogKey);
      if (!catalog) {
        logger.warn({ msg: '[node:COLETAR_INTENCAO] catálogo inválido', catalogKey: config.catalogKey });
        return { outputHandle: 'fallback' };
      }
      // TODO: real - chama LLM com promptText + transcript do visitante e classifica entre catalog.intents
      // Mock: retorna o primeiro intent do catálogo pra fluir o teste
      const picked = catalog.intents[0]?.key ?? 'fallback';
      logger.info({ msg: '[node:COLETAR_INTENCAO] classificou (mock)', catalogKey: config.catalogKey, picked });
      ctx.collectedData.intent = ctx.collectedData.intent ?? {};
      ctx.collectedData.intent[config.catalogKey] = picked;
      return { outputHandle: picked };
    }

    case 'TRANSFERIR_FLUXO': {
      if (!config.targetFlowId) {
        logger.warn({ msg: '[node:TRANSFERIR_FLUXO] sem targetFlowId' });
        return { outputHandle: null };
      }
      logger.info({ msg: '[node:TRANSFERIR_FLUXO] transferindo', targetFlowId: config.targetFlowId });
      return { outputHandle: null, transferTo: { flowId: config.targetFlowId } };
    }

    case 'END': {
      const behavior = config.behavior ?? 'hangup';

      if (config.message) {
        await elevenlabsService.textToSpeech(config.message);
      }

      if (behavior === 'hangup') {
        logger.info({ msg: '[node:END] encerrando ligação', sessionId: ctx.sessionId });
        await twilioService.endCall(ctx.callSid);
      } else if (behavior === 'transfer') {
        let extension = null;
        if (config.extensionId) {
          const ext = await Extension.findOne({ where: { id: config.extensionId, condominium_id: ctx.condominiumId } });
          extension = ext?.number ?? null;
        }
        extension = extension ?? ctx.condominium.fallback_extension;
        if (extension) {
          logger.info({ msg: '[node:END] transferindo ligação', extension, sessionId: ctx.sessionId });
          await twilioService.transferCall(ctx.callSid, extension);
          await callService.updateSession(ctx.sessionId, { status: 'transferred' });
        } else {
          logger.warn({ msg: '[node:END] transfer pedido mas sem ramal configurado', sessionId: ctx.sessionId });
          await twilioService.endCall(ctx.callSid);
        }
      } else {
        // silent: deixa a ligação aberta, só para a execução
        logger.info({ msg: '[node:END] encerrando execução (silent)', sessionId: ctx.sessionId });
      }

      // END nÃ£o tem outputs; o loop de execuÃ§Ã£o naturalmente para.
      return { outputHandle: null };
    }

    default:
      logger.warn({ msg: 'Tipo de node desconhecido', type: node.type });
      return { outputHandle: 'default' };
  }
}

module.exports = processCall;
