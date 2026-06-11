// Handler do protocolo Twilio ConversationRelay via WebSocket.
// Doc: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay
//
// Mensagens recebidas (Twilio → nós):
//  - { type: "setup", callSid, from, to, ... }
//  - { type: "prompt", voicePrompt, last }   // user falou; "last":true = fim do turno
//  - { type: "interrupt", utteranceUntilInterrupt, durationUntilInterruptMs }
//  - { type: "dtmf", digit }
//  - { type: "error", description }
//
// Mensagens enviadas (nós → Twilio):
//  - { type: "text", token, last }            // texto pra TTS sintetizar
//  - { type: "language", ttsLanguage, transcriptionLanguage }
//  - { type: "play", source, loop }
//  - { type: "end", handoffData }
//  - { type: "sendDigits", digits }

const Flow = require('../../models/Flow');
const FlowNode = require('../../models/FlowNode');
const FlowEdge = require('../../models/FlowEdge');
const PhoneNumber = require('../../models/PhoneNumber');
const Condominium = require('../../models/Condominium');
const Unit = require('../../models/Unit');
const Contact = require('../../models/Contact');
const VisitorDataField = require('../../models/VisitorDataField');
const UnitIdentificationLevel = require('../../models/UnitIdentificationLevel');
const callService = require('../../services/callService');
const visitorService = require('../../services/visitorService');
const moradorContactService = require('../../services/moradorContactService');
const openaiService = require('../OpenAIService');
const { getCatalog } = require('../../constants/intentCatalogs');
const { FLOW_TYPES } = require('../../constants/flowTypes');
const { NODE_TYPES } = require('../../constants/nodeTypes');
const { estimateCallCost } = require('../../constants/pricing');
const { debugAnnounceNodes } = require('../../config/env');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

const MAX_NODES_PER_TURN = 50;       // segurança contra loop infinito numa cadeia automática
const MAX_FLOW_TRANSFERS = 5;         // evita ping-pong entre fluxos
const FALLBACK_CONDOMINIUM_ID = 1;    // dev: cai aqui se número não estiver mapeado
const SILENCE_TIMEOUT_MS = 10_000;    // tempo de silêncio antes de re-perguntar
const MAX_SILENCE_RETRIES = 2;        // qts vezes re-pergunta antes de desligar
const CONTATAR_FEEDBACK_INTERVAL_MS = 10_000; // qts em qts seg fala "aguarde" pro visitante
const CONTATAR_FEEDBACK_TEXT = 'Estou entrando em contato com o morador, só um momento.';

function createSession(overrides = {}) {
  return {
    callSid: null,
    from: null,
    to: null,
    condominiumId: null,
    callSessionId: null,        // id da CallSession persistida no banco
    endingNormally: false,      // flag pra distinguir 'completed' de 'abandoned' no close
    flow: null,                 // Flow atual (com nodes + edges)
    nodesById: null,
    edgesBySource: null,
    currentNode: null,
    awaitingInput: false,
    collectedData: {},
    nodeState: null,
    transferCount: 0,
    ttsChars: 0,
    silenceTimer: null,
    silenceRetries: 0,
    lastQuestionText: null,
    startedAt: Date.now(),
    // Transport — quem cria a sessão injeta o sender. Default: noop.
    send: () => {},
    // Flags de simulação:
    skipSilenceTimer: false,    // simulador desliga, evita setTimeout fantasma
    skipTimers: false,           // simulador faz TIMER ser instantâneo
    skipPersistence: false,      // simulador opcional: não cria CallSession nem logs
    mockMoradorDecision: null,   // simulador: short-circuit do CONTATAR ('autorizado'|'naoAutorizado'|'semResposta')
    usageLog: [],                // captura usage da LLM (tokens) pra debug
    ...overrides
  };
}

function handleConnection(ws, _req) {
  const session = createSession({
    send: (payload) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    }
  });

  logger.info({ msg: '[ConversationRelay] WS conectado' });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] mensagem inválida (JSON)', error: err.message });
      return;
    }
    try {
      await handleMessage(ws, session, msg);
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] erro processando mensagem', type: msg.type, error: err.message, stack: err.stack });
    }
  });

  ws.on('close', async () => {
    clearSilenceTimer(session);
    const durationMs = Date.now() - session.startedAt;
    logger.info({ msg: '[ConversationRelay] WS desconectado', callSid: session.callSid, durationMs });
    await finalizeCallSession(session);
  });

  ws.on('error', async (err) => {
    clearSilenceTimer(session);
    logger.error({ msg: '[ConversationRelay] erro WS', error: err.message, callSid: session.callSid });
    await finalizeCallSession(session, { errorMessage: err.message });
  });
}

// ===========================
// CallSession lifecycle
// ===========================

async function finalizeCallSession(session, opts = {}) {
  if (!session.callSessionId) return; // sessão nem chegou a ser criada (ex: condomínio não encontrado)

  const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
  const cost = estimateCallCost({ durationSeconds, ttsChars: session.ttsChars });

  let status;
  if (opts.errorMessage) status = 'failed';
  else if (session.endingNormally) status = 'completed';
  else status = 'abandoned';

  try {
    await callService.updateSession(session.callSessionId, {
      status,
      duration_seconds: durationSeconds,
      tts_chars: session.ttsChars,
      estimated_twilio_cost_usd: cost.twilioCostUsd,
      estimated_tts_cost_usd: cost.ttsCostUsd,
      collected_data: session.collectedData,
      ...(opts.errorMessage ? { error_message: opts.errorMessage } : {})
    });
    await callService.addLog(session.callSessionId, session.condominiumId, 'call_ended', null, {
      status, durationSeconds, ttsChars: session.ttsChars, ...cost
    });
    logger.info({
      msg: '[ConversationRelay] sessão finalizada',
      callSessionId: session.callSessionId,
      status,
      durationSeconds,
      ttsChars: session.ttsChars,
      totalCostUsd: cost.totalCostUsd
    });
  } catch (err) {
    logger.error({ msg: '[ConversationRelay] erro ao finalizar sessão', error: err.message, callSessionId: session.callSessionId });
  }
}

// ===========================
// Silêncio: detecta visitante mudo após pergunta e re-pergunta / encerra
// ===========================

function startSilenceTimer(ws, session) {
  if (session.skipSilenceTimer) return;
  clearSilenceTimer(session);
  session.silenceTimer = setTimeout(() => onSilence(ws, session), SILENCE_TIMEOUT_MS);
}

function clearSilenceTimer(session) {
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }
}

function onSilence(ws, session) {
  if (!session.awaitingInput) return;

  session.silenceRetries += 1;
  logger.info({ msg: '[ConversationRelay] silêncio detectado', callSid: session.callSid, retry: session.silenceRetries });

  if (session.silenceRetries > MAX_SILENCE_RETRIES) {
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'silence_retry_exhausted', session.currentNode?.id ?? null, {});
    }
    sendText(ws, session, 'Não consegui entender. Encerrando a chamada. Por favor, ligue novamente.');
    sendEnd(ws, session);
    session.awaitingInput = false;
    return;
  }

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'silence_detected', session.currentNode?.id ?? null, { retry: session.silenceRetries });
  }

  // Re-pergunta (com prefixo curto + texto da última pergunta)
  const repeat = session.lastQuestionText
    ? `Desculpe, não consegui ouvir. ${session.lastQuestionText}`
    : 'Você está aí?';
  sendText(ws, session, repeat);
  startSilenceTimer(ws, session);
}

// ===========================
// Roteamento de mensagens
// ===========================

async function handleMessage(ws, session, msg) {
  switch (msg.type) {
    case 'setup':
      await handleSetup(ws, session, msg);
      return;
    case 'prompt':
      await handlePrompt(ws, session, msg);
      return;
    case 'interrupt':
      logger.info({ msg: '[ConversationRelay] visitante interrompeu', callSid: session.callSid });
      return;
    case 'dtmf':
      logger.info({ msg: '[ConversationRelay] DTMF', digit: msg.digit, callSid: session.callSid });
      return;
    case 'error':
      logger.error({ msg: '[ConversationRelay] erro reportado pela Twilio', description: msg.description, callSid: session.callSid });
      return;
    default:
      logger.warn({ msg: '[ConversationRelay] tipo de mensagem desconhecido', type: msg.type });
  }
}

async function handleSetup(ws, session, msg) {
  session.callSid = msg.callSid;
  session.from = msg.from;
  session.to = msg.to;

  const setupStartedAt = Date.now();
  logger.info({ msg: '[ConversationRelay] setup', callSid: msg.callSid, from: msg.from, to: msg.to });

  // Identifica o condomínio pelo número discado
  const condominiumId = await resolveCondominiumByNumber(msg.to);
  if (!condominiumId) {
    sendText(ws, session, 'Desculpe, este número não está vinculado a um condomínio. Encerrando a chamada.');
    sendEnd(ws, session);
    return;
  }
  session.condominiumId = condominiumId;

  // Cria CallSession persistida — daqui pra frente todos os eventos viram logs
  try {
    const created = await callService.createSession(condominiumId, {
      caller_number: msg.from ?? 'unknown',
      twilio_call_sid: msg.callSid
    });
    session.callSessionId = created.id;
    await callService.updateSession(created.id, { status: 'in_progress' });
    await callService.addLog(created.id, condominiumId, 'call_started', null, {
      from: msg.from, to: msg.to, callSid: msg.callSid
    });
  } catch (err) {
    logger.error({ msg: '[ConversationRelay] erro criando CallSession', error: err.message });
    // Não bloqueia o atendimento — só perde o tracking
  }

  // Carrega o fluxo ROOT
  const rootFlow = await loadFlowWithGraph({ condominium_id: condominiumId, type: 'ROOT', active: true });
  if (!rootFlow || !rootFlow.entry_node_id) {
    logger.warn({ msg: '[ConversationRelay] fluxo ROOT não configurado', condominiumId });
    if (session.callSessionId) {
      await callService.addLog(session.callSessionId, condominiumId, 'error', null, { reason: 'no_root_flow' });
    }
    sendText(ws, session, 'Atendimento automático indisponível no momento. Encerrando.');
    sendEnd(ws, session);
    return;
  }

  loadFlowIntoSession(session, rootFlow);
  if (session.callSessionId) {
    await callService.updateSession(session.callSessionId, { flow_id: rootFlow.id });
    await callService.addLog(session.callSessionId, condominiumId, 'flow_loaded', null, {
      flowId: rootFlow.id, type: rootFlow.type
    });
  }
  session.currentNode = session.nodesById.get(rootFlow.entry_node_id);

  // DEBUG: tempo total do setup (WS conectado → pronto pra falar). Cobre as
  // queries de banco (condomínio, CallSession, fluxo) que rodam antes de "atender".
  logger.info({ msg: '[ConversationRelay] setup concluído', callSid: msg.callSid, setupMs: Date.now() - setupStartedAt, entryNodeId: rootFlow.entry_node_id });

  // Executa nodes auto até parar num que precise input
  await runUntilInputOrEnd(ws, session);
}

async function handlePrompt(ws, session, msg) {
  if (!msg.last) return; // só agimos quando o turno do user terminou
  if (!session.awaitingInput || !session.currentNode) {
    logger.warn({ msg: '[ConversationRelay] prompt recebido fora de input esperado', callSid: session.callSid });
    return;
  }

  // Visitante respondeu — limpa timer de silêncio e zera retries
  clearSilenceTimer(session);
  session.silenceRetries = 0;

  const transcript = (msg.voicePrompt ?? '').trim();
  logger.info({ msg: '[ConversationRelay] prompt completo', callSid: session.callSid, transcript, currentNode: session.currentNode.id, type: session.currentNode.type });

  // Decide handle conforme tipo do node esperando input
  const node = session.currentNode;
  const decision = await processInput(ws, session, node, transcript);

  // Pode permanecer em espera (loop de coleta) — não avança ainda
  if (decision.stayInNode) {
    startSilenceTimer(ws, session);
    return;
  }

  const chosenHandle = decision.handle ?? 'default';
  const nextEdge = session.edgesBySource.get(`${node.id}:${chosenHandle}`);
  if (!nextEdge) {
    logger.warn({ msg: '[ConversationRelay] sem edge no handle', nodeId: node.id, handle: chosenHandle });
    sendText(ws, session, 'Desculpe, não consegui prosseguir o atendimento. Encerrando.');
    sendEnd(ws, session);
    return;
  }

  session.currentNode = session.nodesById.get(nextEdge.target_node_id);
  session.awaitingInput = false;
  session.nodeState = null; // sai do estado de coleta multi-turno
  await runUntilInputOrEnd(ws, session);
}

// ===========================
// Processamento do input (por tipo de node)
// Retorna: { handle: string, stayInNode?: boolean }
// Quando stayInNode=true, ficamos aguardando próximo input (loop de coleta).
// ===========================

async function processInput(ws, session, node, transcript) {
  if (node.type === 'COLETAR_INTENCAO') {
    return processIntentInput(ws, session, node, transcript);
  }
  if (node.type === 'COLETAR_DADOS_MORADOR') {
    return processColetarDadosMorador(ws, session, node, transcript);
  }
  if (node.type === 'COLETAR_DADOS_VISITA') {
    return processColetarDadosVisita(ws, session, node, transcript);
  }
  // CONTATAR não passa por processInput: o handler em executeNode aguarda a
  // resposta do morador via webhook e retorna outputHandle direto.
  return { handle: 'default' };
}

async function processIntentInput(ws, session, node, transcript) {
  const config = node.config || {};
  const catalog = getCatalog(config.catalogKey);
  if (!catalog) return { handle: 'fallback' };

  let pickedKey = 'fallback';
  let usage = null;

  if (openaiService.isConfigured()) {
    try {
      const { key, usage: u } = await openaiService.classifyIntent(transcript, catalog.intents);
      pickedKey = key;
      usage = u;
      session.usageLog.push({ kind: 'classifyIntent', usage: u });

      // Rede de segurança: o LLM devolveu fallback, mas o keyword matcher pode
      // ainda reconhecer a intenção (ex.: "Visita" → visita). Só resgata quando
      // o keyword acha algo concreto; "bom dia" continua fallback.
      if (pickedKey === 'fallback') {
        const rescued = classifyIntentKeyword(transcript, config.catalogKey);
        if (rescued !== 'fallback') {
          logger.info({ msg: '[ConversationRelay] keyword resgatou intent marcada fallback pelo LLM', catalog: config.catalogKey, rescued, transcript });
          pickedKey = rescued;
        }
      }
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] LLM falhou em classifyIntent — usando keyword', error: err.message });
      pickedKey = classifyIntentKeyword(transcript, config.catalogKey);
    }
  } else {
    pickedKey = classifyIntentKeyword(transcript, config.catalogKey);
  }

  session.collectedData.intent ??= {};
  session.collectedData.intent[config.catalogKey] = pickedKey;
  logger.info({ msg: '[ConversationRelay] intent classificada', catalog: config.catalogKey, picked: pickedKey });

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'intent_classified', node.id, {
      catalogKey: config.catalogKey, transcript, picked: pickedKey, usage
    });
  }

  return { handle: pickedKey };
}

async function processColetarDadosMorador(ws, session, node, transcript) {
  const config = node.config || {};

  // Estado: confirmação após match
  if (session.nodeState?.awaitingConfirmation) {
    return processConfirmacaoMorador(ws, session, node, transcript);
  }

  // Inicializa nodeState se for primeiro turno deste node
  if (session.nodeState?.nodeId !== node.id) {
    session.nodeState = { nodeId: node.id, fields: {}, awaitingConfirmation: false, matchedContact: null };
  }

  const requestedKeys = config.requestedFields ?? [];
  const fieldDefs = await loadFieldDefs(requestedKeys);
  if (fieldDefs.length === 0) {
    logger.warn({ msg: '[ConversationRelay] node sem campos solicitados', nodeId: node.id });
    return { handle: 'dadosNaoConfirmados' };
  }

  const condo = await Condominium.findByPk(session.condominiumId);
  const contextHints = {
    level1Label: condo?.level1_label,
    level2Label: condo?.level2_label
  };

  // Extrai com LLM
  let extracted = {};
  let usage = null;
  if (openaiService.isConfigured()) {
    try {
      const result = await openaiService.extractFields(transcript, fieldDefs, session.nodeState.fields, contextHints);
      extracted = result.extracted || {};
      usage = result.usage;
      session.usageLog.push({ kind: 'extractFields:morador', usage });
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] LLM falhou em extractFields', error: err.message });
    }
  } else {
    sendText(ws, session, 'O sistema de identificação está temporariamente indisponível. Encerrando.');
    sendEnd(ws, session);
    return { handle: 'dadosNaoConfirmados' };
  }

  // Merge com já coletado
  const merged = mergeFields(session.nodeState.fields, extracted);
  session.nodeState.fields = merged;

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'fields_extracted', node.id, {
      transcript, extracted, merged, usage
    });
  }

  // Verifica completude
  const missing = requestedKeys.filter((k) => !merged[k] || String(merged[k]).trim() === '');
  if (missing.length > 0) {
    const missingDef = fieldDefs.filter((f) => missing.includes(f.key));
    const askText = buildMissingFieldsQuestion(missingDef);
    sendText(ws, session, askText);
    session.lastQuestionText = askText;
    return { stayInNode: true };
  }

  // Tudo coletado → busca morador
  const match = await findMoradorMatch(session.condominiumId, merged);
  if (!match) {
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'morador_not_found', node.id, { fields: merged });
    }
    return { handle: 'dadosNaoConfirmados' };
  }

  // Pede confirmação
  session.nodeState.matchedContact = { id: match.contact.id, name: match.contact.name, unitId: match.unit.id };
  session.nodeState.awaitingConfirmation = true;
  const confirmText = `Você vai visitar o(a) ${match.contact.name}?`;
  sendText(ws, session, confirmText);
  session.lastQuestionText = confirmText;
  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'morador_match_pending_confirmation', node.id, {
      contactId: match.contact.id, contactName: match.contact.name
    });
  }
  return { stayInNode: true };
}

async function processConfirmacaoMorador(ws, session, node, transcript) {
  let answer = 'unclear';
  let usage = null;
  if (openaiService.isConfigured()) {
    try {
      const result = await openaiService.classifyYesNo(transcript);
      answer = result.key;
      usage = result.usage;
      session.usageLog.push({ kind: 'classifyYesNo', usage });
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] LLM falhou em classifyYesNo', error: err.message });
    }
  }

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'morador_confirmation', node.id, {
      transcript, answer, contactId: session.nodeState?.matchedContact?.id, usage
    });
  }

  if (answer === 'yes') {
    session.collectedData.morador = session.nodeState.matchedContact;
    return { handle: 'dadosConfirmados' };
  }
  if (answer === 'no') {
    return { handle: 'dadosNaoConfirmados' };
  }
  // unclear → re-pergunta uma vez
  if (!session.nodeState.confirmationRetried) {
    session.nodeState.confirmationRetried = true;
    const retry = `Desculpe, não entendi. Você confirma que vai visitar o(a) ${session.nodeState.matchedContact.name}? Responda com sim ou não.`;
    sendText(ws, session, retry);
    session.lastQuestionText = retry;
    return { stayInNode: true };
  }
  return { handle: 'dadosNaoConfirmados' };
}

async function processColetarDadosVisita(ws, session, node, transcript) {
  const config = node.config || {};

  if (session.nodeState?.nodeId !== node.id) {
    session.nodeState = { nodeId: node.id, fields: {}, visitorLookupDone: false };
  }

  const requestedKeys = config.requestedFields ?? [];
  const fieldDefs = await loadFieldDefs(requestedKeys);

  let extracted = {};
  let usage = null;
  if (openaiService.isConfigured()) {
    try {
      const result = await openaiService.extractFields(transcript, fieldDefs, session.nodeState.fields, {});
      extracted = result.extracted || {};
      usage = result.usage;
      session.usageLog.push({ kind: 'extractFields:visita', usage });
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] LLM falhou em extractFields (visita)', error: err.message });
    }
  }

  let merged = mergeFields(session.nodeState.fields, extracted);

  // Tem nome do visitante + unidade do morador? Tenta reaproveitar visitor já cadastrado.
  // Roda só uma vez por execução do node pra evitar query a cada turno.
  const moradorUnitId = session.collectedData?.morador?.unitId;
  if (!session.nodeState.visitorLookupDone && merged.nome && moradorUnitId) {
    session.nodeState.visitorLookupDone = true;
    try {
      const existing = await visitorService.findInUnit({
        condominiumId: session.condominiumId,
        unitId: moradorUnitId,
        name: merged.nome
      });
      if (existing) {
        // Preenche dados ausentes a partir do cadastro
        if (existing.cpf && !merged.cpf) merged.cpf = existing.cpf;
        if (existing.rg && !merged.rg) merged.rg = existing.rg;
        if (existing.phone && !merged.phone) merged.phone = existing.phone;
        session.nodeState.matchedVisitorId = existing.id;
        if (visitorService.isAuthorizationActive(existing)) {
          session.nodeState.preAuthorized = true;
        }
        if (session.callSessionId) {
          callService.addLog(session.callSessionId, session.condominiumId, 'visitor_matched', node.id, {
            visitorId: existing.id,
            preAuthorized: !!session.nodeState.preAuthorized
          });
        }
      }
    } catch (err) {
      logger.error({ msg: '[ConversationRelay] erro buscando visitor existente', error: err.message });
    }
  }

  session.nodeState.fields = merged;

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'fields_extracted', node.id, {
      transcript, extracted, merged, usage
    });
  }

  const missing = requestedKeys.filter((k) => !merged[k] || String(merged[k]).trim() === '');
  if (missing.length > 0) {
    const missingDef = fieldDefs.filter((f) => missing.includes(f.key));
    const askText = buildMissingFieldsQuestion(missingDef);
    sendText(ws, session, askText);
    session.lastQuestionText = askText;
    return { stayInNode: true };
  }

  // Visita não tem branching de confirmação — só salva e segue
  session.collectedData.visita = {
    ...merged,
    visitorId: session.nodeState.matchedVisitorId || null,
    preAuthorized: !!session.nodeState.preAuthorized
  };
  return { handle: 'default' };
}

// ===========================
// Helpers de coleta de campos
// ===========================

async function loadFieldDefs(keys) {
  if (!keys?.length) return [];
  // Busca tanto em visitor_data_fields quanto em unit_identification_levels
  const [vdf, uil] = await Promise.all([
    VisitorDataField.findAll({ where: { key: { [Op.in]: keys }, active: true } }),
    UnitIdentificationLevel.findAll({ where: { key: { [Op.in]: keys }, active: true } })
  ]);
  const all = [
    ...vdf.map((f) => ({ key: f.key, label: f.label, description: f.description })),
    ...uil.map((l) => ({ key: l.key, label: l.label, description: l.description }))
  ];
  // Ordem segue a ordem de `keys` original pra preservar UX
  return keys.map((k) => all.find((f) => f.key === k)).filter(Boolean);
}

function mergeFields(existing, extracted) {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(extracted)) {
    if (v != null && String(v).trim() !== '') merged[k] = String(v).trim();
  }
  return merged;
}

function buildMissingFieldsQuestion(missingDefs) {
  if (missingDefs.length === 1) {
    return `Faltou o ${missingDefs[0].label.toLowerCase()}. Pode me informar?`;
  }
  const labels = missingDefs.map((d) => d.label.toLowerCase());
  const lastLabel = labels.pop();
  return `Faltou o ${labels.join(', ')} e ${lastLabel}. Pode me informar?`;
}

// Dispara outbound pro morador via Twilio + LLM yes/no, com feedback periódico
// pro visitante enquanto aguarda a decisão. Retorna outputHandle compatível com
// os 3 handles do node CONTATAR: 'autorizado', 'naoAutorizado', 'semResposta'.
async function handleContatarMorador(ws, session, node) {
  const morador = session.collectedData?.morador;
  const visita = session.collectedData?.visita;

  // Simulador: pula outbound real e devolve a decisão mockada.
  if (session.mockMoradorDecision) {
    sendText(ws, session, CONTATAR_FEEDBACK_TEXT);
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'contatar_mocked', node.id, {
        decision: session.mockMoradorDecision
      });
    }
    if (session.mockMoradorDecision === 'autorizado') {
      await maybeRegisterVisitor(session, node);
    }
    return { outputHandle: session.mockMoradorDecision };
  }

  if (!morador?.id) {
    logger.warn({ msg: '[ConversationRelay] CONTATAR sem morador no contexto', nodeId: node.id });
    sendText(ws, session, 'Desculpe, não consegui identificar o morador. Encerrando.');
    return { outputHandle: 'semResposta' };
  }

  // Busca telefone do morador no banco (não trazemos no nodeState pra manter leve)
  const moradorContact = await Contact.findByPk(morador.id);
  const moradorPhone = moradorContact?.phone;
  if (!moradorPhone) {
    logger.warn({ msg: '[ConversationRelay] morador sem telefone cadastrado', moradorId: morador.id });
    sendText(ws, session, 'O morador não tem telefone cadastrado. Encerrando.');
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'contatar_no_phone', node.id, { moradorId: morador.id });
    }
    return { outputHandle: 'semResposta' };
  }

  // Caller ID = número Twilio do próprio condomínio (tabela phone_numbers).
  // Se não houver, o moradorContactService cai no fallback global do .env.
  const condoPhone = await PhoneNumber.findOne({
    where: { condominium_id: session.condominiumId, active: true },
    order: [['id', 'ASC']]
  });
  const fromNumber = condoPhone?.e164_number;

  // Anuncia ao visitante e inicia feedback periódico
  sendText(ws, session, CONTATAR_FEEDBACK_TEXT);
  session.lastQuestionText = null;

  let feedbackInterval = null;
  if (!session.skipTimers) {
    feedbackInterval = setInterval(() => {
      sendText(ws, session, CONTATAR_FEEDBACK_TEXT);
    }, CONTATAR_FEEDBACK_INTERVAL_MS);
  }

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'contatar_outbound_started', node.id, {
      moradorId: morador.id, moradorName: morador.name
    });
  }

  let result;
  try {
    result = await moradorContactService.contactMorador({
      callSessionId: session.callSessionId,
      moradorName: morador.name,
      moradorPhone,
      visitorName: visita?.nome,
      fromNumber
    });
  } finally {
    if (feedbackInterval) clearInterval(feedbackInterval);
  }

  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'contatar_outbound_finished', node.id, result);
  }

  if (result.decision === 'autorizado') {
    await maybeRegisterVisitor(session, node);
  }

  return { outputHandle: result.decision };
}

// Cadastra (ou reaproveita) o visitor e vincula à unidade do morador.
// Roda em CONTATAR no handle 'autorizado'. Idempotente — se já existe vínculo,
// só atualiza dados ausentes. Não roda em fluxos sem morador+visita coletados
// (ifood/encomenda).
async function maybeRegisterVisitor(session, node) {
  const visita = session.collectedData?.visita;
  const morador = session.collectedData?.morador;
  if (!visita?.nome || !morador?.unitId) return;

  try {
    const visitor = await visitorService.findOrCreateAndLink({
      condominiumId: session.condominiumId,
      unitId: morador.unitId,
      name: visita.nome,
      cpf: visita.cpf,
      rg: visita.rg,
      phone: visita.phone
    });
    session.collectedData.visita.visitorId = visitor.id;
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'visitor_registered', node?.id || null, {
        visitorId: visitor.id, unitId: morador.unitId
      });
    }
  } catch (err) {
    logger.error({ msg: '[ConversationRelay] erro cadastrando visitor', error: err.message });
  }
}

async function findMoradorMatch(condominiumId, fields) {
  // 1. Tenta achar a unidade pelo bloco/apto (level1/level2 do condomínio)
  // Os keys das identification levels viraram propriedades em `fields`.
  // Tentativas comuns: bloco+apto, quadra+lote, rua+numero
  const possiblePairs = [
    ['bloco', 'apto'],
    ['quadra', 'lote'],
    ['rua', 'numero']
  ];

  let unit = null;
  for (const [l1Key, l2Key] of possiblePairs) {
    if (fields[l1Key] && fields[l2Key]) {
      unit = await Unit.findOne({
        where: {
          condominium_id: condominiumId,
          level1_value: fields[l1Key],
          level2_value: fields[l2Key]
        }
      });
      if (unit) break;
    }
  }

  if (!unit) return null;

  // 2. Tenta achar o contato (morador) com nome compatível
  const name = fields.nome;
  if (!name) return null;

  // Exact match (case-insensitive) por enquanto. Fuzzy depois.
  const contact = await Contact.findOne({
    where: {
      condominium_id: condominiumId,
      unit_id: unit.id,
      name: { [Op.like]: name }
    }
  });

  if (!contact) {
    // Tenta por LIKE parcial: "João" deve achar "João Silva"
    const partial = await Contact.findOne({
      where: {
        condominium_id: condominiumId,
        unit_id: unit.id,
        name: { [Op.like]: `%${name}%` }
      }
    });
    if (partial) return { unit, contact: partial };
    return null;
  }

  return { unit, contact };
}

// ===========================
// Loop de execução automática (avança até precisar de input ou END)
// ===========================

async function runUntilInputOrEnd(ws, session) {
  let visited = 0;
  while (session.currentNode && visited < MAX_NODES_PER_TURN) {
    visited += 1;
    const node = session.currentNode;
    logger.info({ msg: '[ConversationRelay] executando node', callSid: session.callSid, nodeId: node.id, type: node.type });
    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'node_started', node.id, { type: node.type });
      callService.updateSession(session.callSessionId, { current_node_id: node.id });
    }

    // Debug: anuncia em voz qual node está sendo executado.
    // Habilitar via DEBUG_ANNOUNCE_NODES=true no .env.
    if (debugAnnounceNodes) {
      const label = NODE_TYPES[node.type]?.label ?? node.type;
      sendText(ws, session, `Iniciando ${label}.`);
    }

    const decision = await executeNode(ws, session, node);

    if (session.callSessionId) {
      callService.addLog(session.callSessionId, session.condominiumId, 'node_completed', node.id, {
        type: node.type, ...decision
      });
    }

    if (decision.awaitInput) {
      session.awaitingInput = true;
      session.silenceRetries = 0;
      startSilenceTimer(ws, session);
      return;
    }
    if (decision.endCall) {
      clearSilenceTimer(session);
      return;
    }
    if (decision.transferred) {
      // currentNode já foi atualizado por handleTransferirFluxo
      continue;
    }
    // Avança pelo handle solicitado (default na maioria)
    const handle = decision.outputHandle ?? 'default';
    const nextEdge = session.edgesBySource.get(`${node.id}:${handle}`);
    if (!nextEdge) {
      logger.info({ msg: '[ConversationRelay] sem próximo node — encerrando fluxo', callSid: session.callSid });
      sendEnd(ws, session);
      return;
    }
    session.currentNode = session.nodesById.get(nextEdge.target_node_id);
  }

  if (visited >= MAX_NODES_PER_TURN) {
    logger.warn({ msg: '[ConversationRelay] limite de nodes por turno atingido', callSid: session.callSid });
  }
}

// ===========================
// Handlers por tipo de node
// Retornam: { awaitInput?, endCall?, transferred?, outputHandle? }
// ===========================

async function executeNode(ws, session, node) {
  const config = node.config || {};

  switch (node.type) {
    case 'COMUNICACAO': {
      const text = (config.text ?? '').trim();
      if (text) sendText(ws, session, text);
      return { outputHandle: 'default' };
    }

    case 'COLETAR_INTENCAO': {
      const promptText = config.promptText?.trim();
      if (promptText) {
        sendText(ws, session, promptText);
        session.lastQuestionText = promptText;
      }
      return { awaitInput: true };
    }

    case 'COLETAR_DADOS_MORADOR':
    case 'COLETAR_DADOS_VISITA': {
      const promptText = config.promptText?.trim();
      if (promptText) {
        sendText(ws, session, promptText);
        session.lastQuestionText = promptText;
      }
      return { awaitInput: true };
    }

    case 'CONTATAR': {
      // Visitante com janela de autorização ativa → pula contato e libera direto.
      if (session.collectedData?.visita?.preAuthorized) {
        await maybeRegisterVisitor(session, node);
        if (session.callSessionId) {
          callService.addLog(session.callSessionId, session.condominiumId, 'contatar_skipped_preauthorized', node.id, {
            visitorId: session.collectedData.visita.visitorId
          });
        }
        return { outputHandle: 'autorizado' };
      }
      return await handleContatarMorador(ws, session, node);
    }

    case 'COMANDO': {
      // TODO: integração com gate
      logger.info({ msg: '[ConversationRelay] COMANDO mock', command: config.command, gateId: config.gateId });
      return { outputHandle: 'default' };
    }

    case 'TIMER': {
      const seconds = Number(config.durationSeconds ?? 0);
      if (seconds > 0 && !session.skipTimers) {
        await new Promise((r) => setTimeout(r, seconds * 1000));
      }
      return { outputHandle: 'default' };
    }

    case 'TRANSFERIR_FLUXO': {
      return await handleTransferirFluxo(ws, session, config);
    }

    case 'END': {
      const message = config.message?.trim();
      if (message) sendText(ws, session, message);
      // ConversationRelay aguarda o TTS terminar antes de cortar a chamada quando recebe `end`
      sendEnd(ws, session);
      return { endCall: true };
    }

    default:
      logger.warn({ msg: '[ConversationRelay] tipo de node desconhecido', type: node.type });
      return { outputHandle: 'default' };
  }
}

async function handleTransferirFluxo(ws, session, config) {
  if (!config.targetFlowId) {
    sendText(ws, session, 'Encaminhamento não configurado. Encerrando.');
    sendEnd(ws, session);
    return { endCall: true };
  }
  session.transferCount += 1;
  if (session.transferCount > MAX_FLOW_TRANSFERS) {
    logger.warn({ msg: '[ConversationRelay] limite de transferências excedido', callSid: session.callSid });
    sendEnd(ws, session);
    return { endCall: true };
  }

  const target = await loadFlowWithGraph({ id: config.targetFlowId, condominium_id: session.condominiumId });

  if (!target) {
    sendText(ws, session, 'Encaminhamento não disponível no momento. Encerrando.');
    sendEnd(ws, session);
    return { endCall: true };
  }

  // Fluxo destino vazio (ainda não montado) → anuncia e encerra
  if (!target.entry_node_id || (target.nodes ?? []).length === 0) {
    const friendly = FLOW_TYPES[target.type]?.label ?? target.name;
    sendText(ws, session, `Encaminhando para ${friendly}. Esse atendimento ainda está sendo configurado. Tente novamente mais tarde.`);
    sendEnd(ws, session);
    return { endCall: true };
  }

  const fromFlowId = session.flow?.id;
  loadFlowIntoSession(session, target);
  session.currentNode = session.nodesById.get(target.entry_node_id);
  logger.info({ msg: '[ConversationRelay] transferido pra fluxo', flowId: target.id, type: target.type, callSid: session.callSid });
  if (session.callSessionId) {
    callService.addLog(session.callSessionId, session.condominiumId, 'flow_transferred', null, {
      fromFlowId, toFlowId: target.id, toFlowType: target.type
    });
    callService.updateSession(session.callSessionId, { flow_id: target.id });
  }
  return { transferred: true };
}

// ===========================
// Helpers de carregamento e indexação
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

function loadFlowIntoSession(session, flow) {
  session.flow = flow;
  session.nodesById = new Map((flow.nodes ?? []).map((n) => [n.id, n]));
  session.edgesBySource = new Map();
  for (const e of flow.edges ?? []) {
    session.edgesBySource.set(`${e.source_node_id}:${e.source_handle}`, e);
  }
}

async function resolveCondominiumByNumber(toNumber) {
  if (!toNumber) return FALLBACK_CONDOMINIUM_ID;
  const row = await PhoneNumber.findOne({ where: { e164_number: toNumber, active: true } });
  if (row) return row.condominium_id;
  logger.warn({ msg: '[ConversationRelay] número sem mapeamento, usando fallback', toNumber, fallback: FALLBACK_CONDOMINIUM_ID });
  return FALLBACK_CONDOMINIUM_ID;
}

// ===========================
// Classificação simples por keywords (stopgap até plugar LLM)
// ===========================

const INTENT_KEYWORDS = {
  o_que_deseja: {
    visita: ['visita', 'visitar', 'visitando', 'amigo', 'amiga', 'familiar', 'morador'],
    ifood: ['ifood', 'comida', 'rappi', '99food', 'uber eats', 'lanche', 'pedido', 'restaurante', 'delivery'],
    encomenda: ['pacote', 'encomenda', 'correios', 'amazon', 'mercado livre', 'shopee', 'entrega'],
    prestador: ['prestador', 'serviço', 'servico', 'técnico', 'tecnico', 'manutenção', 'manutencao', 'reparo', 'eletricista', 'encanador', 'pintor', 'marceneiro']
  },
  para_quem: {
    morador: ['morador', 'apto', 'apartamento', 'casa', 'unidade'],
    condominio: ['condomínio', 'condominio', 'administração', 'administracao', 'síndico', 'sindico', 'portaria', 'zelador']
  }
};

// Fallback keyword matcher — usado quando OPENAI_API_KEY não está configurada ou LLM falha.
function classifyIntentKeyword(transcript, catalogKey) {
  const catalog = getCatalog(catalogKey);
  if (!catalog) return 'fallback';

  const lower = transcript.toLowerCase();
  const keywordsMap = INTENT_KEYWORDS[catalogKey] ?? {};

  // Avalia cada intent e conta quantas keywords batem; pega a com mais matches.
  let best = { key: 'fallback', score: 0 };
  for (const intent of catalog.intents) {
    const keywords = keywordsMap[intent.key] ?? [intent.key];
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > best.score) best = { key: intent.key, score };
  }
  return best.key;
}

// ===========================
// Senders
// ===========================

// Senders. session.send é injetado pelo "transport" (WS real ou simulador).
// Mantemos o param ws (não usado) por compatibilidade com call sites existentes —
// o simulador passa null e tudo funciona.
function sendText(_ws, session, text) {
  if (!session?.send) return;
  session.ttsChars = (session.ttsChars ?? 0) + (text?.length ?? 0);
  // DEBUG: registra exatamente o que o caller vai ouvir (inclui mensagens de erro).
  logger.info({ msg: '[ConversationRelay] → fala pro caller (TTS)', callSid: session.callSid, nodeId: session.currentNode?.id, text });
  session.send({ type: 'text', token: text, last: true });
}

function sendEnd(_ws, session) {
  if (!session?.send) return;
  session.endingNormally = true;
  // DEBUG: registra encerramento da chamada (envio do `end` pro ConversationRelay).
  logger.info({ msg: '[ConversationRelay] → END enviado (encerrando chamada)', callSid: session.callSid });
  session.send({ type: 'end' });
}

module.exports = {
  handleConnection,
  // Exposto pra simulador (src/integrations/twilio/simulator.js):
  createSession,
  handleMessage,
  handleSetup,
  handlePrompt,
  executeNode,
  processInput,
  finalizeCallSession,
  loadFlowWithGraph,
  loadFlowIntoSession,
  resolveCondominiumByNumber,
  // Exposto pra teste unitário:
  classifyIntentKeyword
};
