'use strict';

// Tabela que mapeia número de telefone (E.164) ao condomínio que atende.
// Usado pelo handler do ConversationRelay pra identificar qual condomínio
// é o destinatário de uma chamada inbound.

module.exports = {
  async up(queryInterface, Sequelize) {
    const ID = { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true };
    const TS = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };

    await queryInterface.createTable('phone_numbers', {
      id: ID,
      condominium_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Número no formato E.164 (ex: +551926603062). Único globalmente.
      e164_number: { type: Sequelize.STRING(32), allowNull: false, unique: true },
      provider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'twilio' },
      label: { type: Sequelize.STRING, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: TS,
      updated_at: TS
    });

    await queryInterface.addIndex('phone_numbers', ['condominium_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('phone_numbers');
  }
};
