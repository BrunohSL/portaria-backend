const { Router } = require('express');
const { buildConversationRelayTwiml, buildVoiceWsUrl } = require('../integrations/twilio/twiml');
const { elevenlabs: elevenlabsConfig } = require('../config/env');
const moradorContactService = require('../services/moradorContactService');
const openaiService = require('../integrations/OpenAIService');
const logger = require('../config/logger');

const router = Router();

function escapeXml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// Webhook chamado pela Twilio quando uma chamada chega no número.
// Resposta: TwiML que conecta a chamada ao nosso WebSocket via ConversationRelay.
//
// Configuração na Twilio:
//  Phone Number → Voice & Fax → "A CALL COMES IN" → Webhook (POST) → <PUBLIC_BACKEND_URL>/api/twilio/voice
router.post('/voice', (req, res) => {
  try {
    if (!elevenlabsConfig?.voiceId) {
      logger.error({ msg: '[twilio/voice] ELEVENLABS_VOICE_ID não configurado' });
      res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Configuração inválida.</Say><Hangup/></Response>'
      );
      return;
    }

    const wsUrl = buildVoiceWsUrl();
    const twiml = buildConversationRelayTwiml({
      wsUrl,
      voice: elevenlabsConfig.voiceId,
      ttsProvider: 'ElevenLabs',
      language: 'pt-BR',
      transcriptionLanguage: 'pt-BR'
    });

    logger.info({
      msg: '[twilio/voice] chamada recebida',
      callSid: req.body?.CallSid,
      from: req.body?.From,
      to: req.body?.To,
      wsUrl
    });

    res.type('text/xml').send(twiml);
  } catch (err) {
    logger.error({ msg: '[twilio/voice] erro', error: err.message });
    res.type('text/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Erro interno.</Say><Hangup/></Response>'
    );
  }
});

// Webhook chamado pela Twilio quando o morador atende e o <Gather> captura fala.
// Classifica sim/não via LLM. Resolve a Promise pendente da sessão do visitante.
router.post('/morador-decision/:callSessionId', async (req, res) => {
  const callSessionId = req.params.callSessionId;
  const transcript = (req.body?.SpeechResult || '').trim();
  logger.info({ msg: '[twilio/morador-decision] resposta recebida', callSessionId, transcript });

  let answer = 'unclear';
  if (transcript && openaiService.isConfigured()) {
    try {
      const result = await openaiService.classifyYesNo(transcript);
      answer = result.key;
    } catch (err) {
      logger.error({ msg: '[twilio/morador-decision] erro LLM classifyYesNo', error: err.message });
    }
  }

  if (answer === 'yes') {
    moradorContactService.resolvePending(callSessionId, { decision: 'autorizado', transcript });
    return res.type('text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR">Obrigado, autorização confirmada.</Say>
  <Hangup/>
</Response>`
    );
  }

  if (answer === 'no') {
    moradorContactService.resolvePending(callSessionId, { decision: 'naoAutorizado', transcript });
    return res.type('text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR">Entendido, entrada negada.</Say>
  <Hangup/>
</Response>`
    );
  }

  // unclear → fallback no segundo Gather do TwiML inicial. Aqui só responde
  // com nova pergunta.
  return res.type('text/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="pt-BR" speechTimeout="auto" timeout="5" action="${escapeXml(`/api/twilio/morador-decision/${callSessionId}`)}" method="POST">
    <Say language="pt-BR">Não entendi. Você autoriza a entrada? Responda sim ou não.</Say>
  </Gather>
  <Hangup/>
</Response>`
  );
});

// Status callback da Twilio. Chega quando a chamada termina (atendida ou não).
// Se a Promise ainda não foi resolvida (ex: morador não atendeu, chamada falhou,
// caiu sem resposta), resolve aqui como `semResposta`.
router.post('/morador-status/:callSessionId', (req, res) => {
  const callSessionId = req.params.callSessionId;
  const status = req.body?.CallStatus;
  logger.info({ msg: '[twilio/morador-status] status', callSessionId, status, callSid: req.body?.CallSid });

  // Status terminais que devem resolver semResposta se ainda não há decisão.
  const terminal = ['completed', 'no-answer', 'busy', 'failed', 'canceled'];
  if (terminal.includes(status)) {
    moradorContactService.resolvePending(callSessionId, {
      decision: 'semResposta',
      reason: `call_${status}`
    });
  }

  res.status(200).send('OK');
});

module.exports = router;
