// Simulador do ConversationRelay — testa fluxos sem chamada telefônica real.
//
// 2 modos:
//  1. simulateCall: chamada inteira ponta-a-ponta. Persiste CallSession+logs no banco
//     pra inspeção posterior. Bate na LLM de verdade (custo desprezível).
//  2. testNode: testa 1 node isolado com input customizado. Stateless (não persiste).
//
// Doc: docs/simulator.md

const cr = require('./conversationRelay');
const logger = require('../../config/logger');

const FALLBACK_CONDOMINIUM_ID = 1;

/**
 * Simula uma chamada inteira do começo ao fim.
 *
 * @param {object} input
 * @param {number} [input.condominiumId] - se omitido, resolve pelo toNumber
 * @param {string} [input.toNumber]      - número discado pelo "visitante" (default: +551926603062)
 * @param {string} [input.fromNumber]    - identidade do "visitante" (default: sim-caller)
 * @param {string[]} input.responses     - lista de respostas em ordem
 * @param {string|null} [input.mockMoradorDecision] - default `null` (faz outbound real pra Twilio).
 *                                         Passe 'autorizado' | 'naoAutorizado' | 'semResposta' pra
 *                                         pular o outbound e devolver a decisão direto.
 * @returns {Promise<{ transcript, callSessionId, ttsChars, usageLog, finalState }>}
 */
async function simulateCall({ condominiumId, toNumber, fromNumber, responses = [], mockMoradorDecision = null } = {}) {
  if (!Array.isArray(responses)) {
    throw new Error('responses deve ser um array de strings');
  }

  const captured = [];
  const transcript = [];
  let endedNormally = false;

  const session = cr.createSession({
    skipSilenceTimer: true,
    skipTimers: true,
    mockMoradorDecision,
    send: (payload) => {
      captured.push(payload);
      if (payload.type === 'text') {
        transcript.push({ from: 'bot', text: payload.token });
      } else if (payload.type === 'end') {
        transcript.push({ from: 'end' });
        endedNormally = true;
      }
    }
  });

  // Setup
  await cr.handleMessage(null, session, {
    type: 'setup',
    callSid: `sim-${Date.now()}`,
    from: fromNumber ?? 'sim-caller',
    to: toNumber ?? '+551926603062'
  });

  // Drive cada resposta
  for (const response of responses) {
    if (endedNormally) break;
    if (!session.awaitingInput) {
      logger.warn({ msg: '[Simulator] bot não estava esperando input — descartando resposta', response });
      break;
    }
    transcript.push({ from: 'user', text: response });
    await cr.handleMessage(null, session, {
      type: 'prompt',
      voicePrompt: response,
      last: true
    });
  }

  // Finaliza CallSession (computa duração, custos)
  await cr.finalizeCallSession(session);

  let finalState;
  if (endedNormally) finalState = 'completed';
  else if (session.awaitingInput) finalState = 'awaiting_input';
  else finalState = 'incomplete';

  return {
    transcript,
    callSessionId: session.callSessionId,
    ttsChars: session.ttsChars,
    usageLog: session.usageLog,
    finalState,
    awaitingInput: session.awaitingInput,
    currentNodeId: session.currentNode?.id ?? null,
    collectedData: session.collectedData
  };
}

/**
 * Testa um node isolado com config customizada e (opcionalmente) input do user.
 * Stateless: não persiste CallSession nem logs.
 *
 * @param {object} input
 * @param {string} input.type           - tipo do node (TIMER, COMUNICACAO, COLETAR_INTENCAO, ...)
 * @param {object} input.config         - config do node (mesma shape que o editor salva)
 * @param {number} [input.condominiumId]
 * @param {object} [input.alreadyCollected] - estado pré-existente (pra COLETAR_DADOS_*)
 * @param {string} [input.userInput]    - se presente, simula um turno do user (chama processInput)
 *                                        se ausente, executa o node direto (chama executeNode)
 * @param {string|null} [input.mockMoradorDecision] - default `null` (faz outbound real pra Twilio).
 *                                        Passe 'autorizado' | 'naoAutorizado' | 'semResposta' pra
 *                                        pular o outbound. Aplicável quando type='CONTATAR'.
 * @returns {Promise<{ botMessages, ended, result, sessionState }>}
 */
async function testNode({ type, config, condominiumId, alreadyCollected, userInput, mockMoradorDecision = null } = {}) {
  if (!type) throw new Error('type é obrigatório');

  const captured = [];

  const fakeNodeId = `test-node-${Date.now()}`;
  const node = { id: fakeNodeId, type, config: config ?? {} };

  const nodeState = alreadyCollected
    ? { nodeId: fakeNodeId, fields: { ...alreadyCollected }, awaitingConfirmation: false, matchedContact: null }
    : null;

  const session = cr.createSession({
    callSid: `test-${Date.now()}`,
    condominiumId: condominiumId ?? FALLBACK_CONDOMINIUM_ID,
    skipSilenceTimer: true,
    skipTimers: true,
    mockMoradorDecision,
    nodeState,
    currentNode: node,
    send: (payload) => captured.push(payload)
  });

  let result;
  if (userInput !== undefined && userInput !== null) {
    // Simula um turno do user → chama processInput
    result = await cr.processInput(null, session, node, String(userInput));
  } else {
    // Sem input → executa o node "do zero"
    result = await cr.executeNode(null, session, node);
  }

  const botMessages = captured.filter((m) => m.type === 'text').map((m) => m.token);
  const ended = captured.some((m) => m.type === 'end');

  return {
    botMessages,
    ended,
    result,
    sessionState: {
      nodeState: session.nodeState,
      collectedData: session.collectedData,
      ttsChars: session.ttsChars,
      usageLog: session.usageLog,
      awaitingInput: session.awaitingInput
    }
  };
}

module.exports = { simulateCall, testNode };
