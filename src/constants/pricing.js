// Tarifas estimadas pra cálculo de custo por chamada.
// Em produção, considerar puxar essas tarifas de uma config por condomínio
// (clientes podem ter contratos negociados com Twilio em volume).
//
// Atualizar quando os planos forem renegociados ou os preços mudarem.
// Last reviewed: 2026-05.

const PRICING = {
  twilio: {
    // Inbound BR — pode variar por região do número
    voiceInboundPerMinUsd: 0.060,
    // ConversationRelay (orquestração + STT bundled)
    conversationRelayPerMinUsd: 0.015
  },
  elevenlabs: {
    // Tarifa efetiva no plano Pro ($99/mo, 500k chars)
    // Free: $0.30/1k | Creator: $0.22/1k | Pro: $0.198/1k | Scale: $0.165/1k | Business: $0.12/1k
    perCharUsd: 0.000198
  }
};

/**
 * Estima o custo total de uma chamada com base em duração e caracteres TTS.
 * @param {Object} params
 * @param {number} params.durationSeconds - duração da chamada
 * @param {number} params.ttsChars - total de caracteres sintetizados pela ElevenLabs
 * @returns {{ twilioCostUsd: number, ttsCostUsd: number, totalCostUsd: number }}
 */
function estimateCallCost({ durationSeconds = 0, ttsChars = 0 }) {
  const minutes = durationSeconds / 60;
  const twilioCostUsd =
    minutes * (PRICING.twilio.voiceInboundPerMinUsd + PRICING.twilio.conversationRelayPerMinUsd);
  const ttsCostUsd = ttsChars * PRICING.elevenlabs.perCharUsd;
  return {
    twilioCostUsd: Number(twilioCostUsd.toFixed(4)),
    ttsCostUsd: Number(ttsCostUsd.toFixed(4)),
    totalCostUsd: Number((twilioCostUsd + ttsCostUsd).toFixed(4))
  };
}

module.exports = { PRICING, estimateCallCost };
