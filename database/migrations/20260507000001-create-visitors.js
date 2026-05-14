'use strict';

// Visitors são pessoas externas ao condomínio que podem visitar uma ou mais
// unidades. Match no fluxo é por nome + unidade (telefone nem sempre vem).
// authorized_from / authorized_until permitem autorização permanente
// (ex: pai pode entrar sempre na unidade 201) — quando a janela está ativa,
// o fluxo pula o CONTATAR e libera direto.

module.exports = {
  async up(queryInterface, Sequelize) {
    const ID = { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true };
    const TS = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };

    await queryInterface.createTable('visitors', {
      id: ID,
      condominium_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: { type: Sequelize.STRING, allowNull: false },
      cpf: { type: Sequelize.STRING, allowNull: true },
      rg: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      authorized_from: { type: Sequelize.DATE, allowNull: true },
      authorized_until: { type: Sequelize.DATE, allowNull: true },
      created_at: TS,
      updated_at: TS
    });

    await queryInterface.addIndex('visitors', ['condominium_id', 'name']);
    await queryInterface.addIndex('visitors', ['condominium_id', 'cpf']);

    await queryInterface.createTable('unit_visitors', {
      id: ID,
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'units', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      visitor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'visitors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: TS,
      updated_at: TS,
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('unit_visitors', ['unit_id']);
    await queryInterface.addIndex('unit_visitors', ['visitor_id']);
    await queryInterface.addIndex('unit_visitors', ['unit_id', 'visitor_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('unit_visitors');
    await queryInterface.dropTable('visitors');
  }
};
