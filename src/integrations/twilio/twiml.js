// Geração do TwiML que conecta a chamada ao ConversationRelay.
// Doc: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay

const { publicBackendUrl } = require('../../config/env');

function escapeXml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * TwiML que pluga a chamada no nosso WS de ConversationRelay.
 * Twilio cuida de STT (Deepgram default), TTS (ElevenLabs com a voz configurada),
 * e VAD/turn-taking. A gente só responde texto via WS.
 */
function buildConversationRelayTwiml({
  wsUrl,
  voice,
  ttsProvider = 'ElevenLabs',
  language = 'pt-BR',
  transcriptionLanguage = 'pt-BR'
}) {
  // Sem welcomeGreeting: a primeira fala vem do node de entrada do fluxo ROOT,
  // executado pelo handler do ConversationRelay assim que recebe o evento `setup`.
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${escapeXml(wsUrl)}"
      ttsProvider="${escapeXml(ttsProvider)}"
      voice="${escapeXml(voice)}"
      language="${escapeXml(language)}"
      transcriptionLanguage="${escapeXml(transcriptionLanguage)}"
    />
  </Connect>
</Response>`;
}

function buildVoiceWsUrl() {
  // PUBLIC_BACKEND_URL deve ser https://... (ngrok ou domínio).
  // O ConversationRelay espera wss://, então trocamos o protocolo.
  if (!publicBackendUrl) throw new Error('PUBLIC_BACKEND_URL não configurada');
  const host = publicBackendUrl.replace(/^https?:\/\//, '');
  return `wss://${host}/api/twilio/conversation-relay`;
}

module.exports = { buildConversationRelayTwiml, buildVoiceWsUrl };
