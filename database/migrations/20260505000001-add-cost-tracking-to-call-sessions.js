'use strict';

// Adiciona campos de tracking de custo na tabela call_sessions.
// Custos são estimativas calculadas no fim da chamada com base em:
//   - duration_seconds (já existente) → custos Twilio (voice + ConversationRelay)
//   - tts_chars (novo) × tarifa ElevenLabs do plano configurado → custo TTS
// O cron de reconciliação (futuro) substitui os estimados pelos valores reais
// puxados das APIs Twilio/ElevenLabs.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('call_sessions', 'tts_chars', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('call_sessions', 'estimated_twilio_cost_usd', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('call_sessions', 'estimated_tts_cost_usd', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('call_sessions', 'estimated_tts_cost_usd');
    await queryInterface.removeColumn('call_sessions', 'estimated_twilio_cost_usd');
    await queryInterface.removeColumn('call_sessions', 'tts_chars');
  }
};
