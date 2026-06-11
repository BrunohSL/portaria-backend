// Orquestra a chamada outbound pro morador disparada pelo node CONTATAR.
// Mantém um registry em memória mapeando callSessionId → { resolve, reject, timeout }
// pra que o webhook de decisão possa retornar o resultado pra a sessão WebSocket
// do visitante que está aguardando.
//
// Único processo: Map em memória basta. Se algum dia tivermos múltiplos workers,
// trocar por Redis pub/sub.

const twilioClient = require('../integrations/twilio/twilioClient');
const { normalizeBR } = require('../utils/phoneNormalizer');
const { publicBackendUrl } = require('../config/env');
const logger = require('../config/logger');

// Tempo máximo total esperando o morador atender + responder.
// 20s ring + 5s 1ª pergunta + 5s 2ª pergunta = 30s. Com folga pra latência: 35s.
const CONTACT_TOTAL_TIMEOUT_MS = 35_000;

// Tempo de ring antes de Twilio considerar no-answer (param da API)
const RING_TIMEOUT_SEC = 20;

// Map: callSessionId → { resolve, reject, timeoutId, twilioCallSid, decision? }
const pending = new Map();

function isConfigured() {
  return twilioClient.isConfigured() && !!publicBackendUrl;
}

// Resolve o número de origem (From) pra outbound. Caller passa o `fromNumber`
// vindo da tabela phone_numbers do condomínio. Se vier vazio, cai no fallback
// global do .env (útil em dev/testes).
function resolveFromNumber(fromNumber) {
  return fromNumber || twilioClient.fromNumber();
}

function buildOutboundTwiml({ moradorName, visitorName, callSessionId, baseUrl }) {
  const decisionUrl = `${baseUrl}/api/twilio/morador-decision/${callSessionId}`;
  const safeMorador = escapeXml(moradorName || 'morador');
  const safeVisitor = escapeXml(visitorName || 'visitante');

  // 2 tentativas: 1ª pergunta, se silêncio re-pergunta. Após segunda falha → hangup
  // (status callback marca semResposta).
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="pt-BR" speechTimeout="auto" timeout="5" action="${escapeXml(decisionUrl)}" method="POST">
    <Say language="pt-BR">Olá ${safeMorador}. Tem um visitante chamado ${safeVisitor} na portaria querendo entrar. Você autoriza a entrada? Responda sim ou não.</Say>
  </Gather>
  <Gather input="speech" language="pt-BR" speechTimeout="auto" timeout="5" action="${escapeXml(decisionUrl)}" method="POST">
    <Say language="pt-BR">Não entendi sua resposta. Você autoriza a entrada de ${safeVisitor}? Responda sim ou não.</Say>
  </Gather>
  <Hangup/>
</Response>`;
}

function escapeXml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// Inicia o contato. Retorna uma Promise que resolve com:
//   { decision: 'autorizado' | 'naoAutorizado' | 'semResposta', transcript?, reason? }
// `transcript` presente quando houve fala. `reason` no caso de erro/timeout.
//
// `fromNumber` deve vir da tabela phone_numbers do condomínio. Se ausente,
// cai no fallback do .env (TWILIO_PHONE_NUMBER) — útil só em dev.
async function contactMorador({ callSessionId, moradorName, moradorPhone, visitorName, fromNumber }) {
  if (!isConfigured()) {
    return { decision: 'semResposta', reason: 'twilio_not_configured' };
  }

  const resolvedFrom = resolveFromNumber(fromNumber);
  if (!resolvedFrom) {
    logger.error({ msg: '[moradorContact] sem número de origem (condomínio sem phone_number ativo e .env sem fallback)' });
    return { decision: 'semResposta', reason: 'missing_from_number' };
  }

  let toNumber;
  try {
    toNumber = normalizeBR(moradorPhone);
  } catch (err) {
    logger.error({ msg: '[moradorContact] telefone inválido', moradorPhone, error: err.message });
    return { decision: 'semResposta', reason: 'invalid_phone' };
  }

  const baseUrl = publicBackendUrl.replace(/\/$/, '');
  const twiml = buildOutboundTwiml({ moradorName, visitorName, callSessionId, baseUrl });
  const statusCallbackUrl = `${baseUrl}/api/twilio/morador-status/${callSessionId}`;

  return new Promise(async (resolve) => {
    // Timeout total de segurança (caso status callback nunca chegue)
    const timeoutId = setTimeout(() => {
      const entry = pending.get(callSessionId);
      if (entry && !entry.settled) {
        entry.settled = true;
        pending.delete(callSessionId);
        logger.warn({ msg: '[moradorContact] timeout total', callSessionId });
        resolve({ decision: 'semResposta', reason: 'total_timeout' });
      }
    }, CONTACT_TOTAL_TIMEOUT_MS);

    pending.set(callSessionId, { resolve, timeoutId, settled: false });

    const createStartedAt = Date.now();
    try {
      const call = await twilioClient.createCall({
        From: resolvedFrom,
        To: toNumber,
        Twiml: twiml,
        Timeout: RING_TIMEOUT_SEC,
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: ['completed', 'no-answer', 'failed', 'busy', 'canceled']
      });
      const entry = pending.get(callSessionId);
      if (entry) entry.twilioCallSid = call.sid;
      logger.info({ msg: '[moradorContact] outbound iniciado', callSessionId, twilioCallSid: call.sid, to: toNumber, createMs: Date.now() - createStartedAt });
    } catch (err) {
      const entry = pending.get(callSessionId);
      if (entry && !entry.settled) {
        entry.settled = true;
        clearTimeout(entry.timeoutId);
        pending.delete(callSessionId);
        logger.error({ msg: '[moradorContact] erro criando outbound', callSessionId, error: err.message, code: err.code, createMs: Date.now() - createStartedAt });
        resolve({ decision: 'semResposta', reason: 'outbound_failed' });
      }
    }
  });
}

// Resolve a Promise pendente com a decisão recebida do webhook.
function resolvePending(callSessionId, result) {
  const entry = pending.get(callSessionId);
  if (!entry || entry.settled) return false;
  entry.settled = true;
  clearTimeout(entry.timeoutId);
  pending.delete(callSessionId);
  entry.resolve(result);
  return true;
}

module.exports = {
  contactMorador,
  resolvePending,
  isConfigured
};
