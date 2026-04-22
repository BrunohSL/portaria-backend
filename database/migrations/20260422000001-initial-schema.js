'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. condominiums
    await queryInterface.createTable('condominiums', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: { type: Sequelize.STRING, allowNull: false },
      cnpj: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING, allowNull: true },
      state: { type: Sequelize.STRING, allowNull: true },
      zip_code: { type: Sequelize.STRING, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      twilio_phone_number: { type: Sequelize.STRING, allowNull: true },
      fallback_extension: { type: Sequelize.STRING, allowNull: true },
      gates_config: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      extensions_config: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      level1_label: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Bloco' },
      level2_label: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Apto' },
      created_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 2. users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash: { type: Sequelize.TEXT, allowNull: false },
      role: { type: Sequelize.ENUM('ADM', 'CLIENT_ADM', 'SUPPORT'), allowNull: false },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      first_access: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    // 3. units
    await queryInterface.createTable('units', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      level1_value: { type: Sequelize.STRING, allowNull: false },
      level2_value: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.ENUM('occupied', 'vacant'), defaultValue: 'vacant' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('units', ['condominium_id', 'level1_value', 'level2_value'], { unique: true });

    // 4. residents
    await queryInterface.createTable('residents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      unit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'units', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: { type: Sequelize.STRING, allowNull: false },
      cpf: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      phone_2: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.ENUM('owner', 'tenant', 'dependent'), defaultValue: 'owner' },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      can_authorize: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('residents', ['condominium_id']);
    await queryInterface.addIndex('residents', ['unit_id']);

    // 5. flows
    await queryInterface.createTable('flows', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('flows', ['condominium_id']);

    // 6. flow_steps
    await queryInterface.createTable('flow_steps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      flow_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'flows', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      step_order: { type: Sequelize.INTEGER, allowNull: false },
      type: {
        type: Sequelize.ENUM('GREETING', 'COLLECT_DATA', 'VALIDATE_RESIDENT', 'ASK_QUESTION', 'OPEN_GATE', 'TRANSFER_CALL', 'END_CALL'),
        allowNull: false
      },
      config: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('flow_steps', ['flow_id', 'step_order']);
    await queryInterface.addIndex('flow_steps', ['condominium_id']);

    // 7. call_sessions
    await queryInterface.createTable('call_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      flow_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'flows', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      twilio_call_sid: { type: Sequelize.STRING, allowNull: true, unique: true },
      caller_number: { type: Sequelize.STRING, allowNull: false },
      current_step_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'flow_steps', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('queued', 'in_progress', 'completed', 'failed', 'transferred', 'abandoned'),
        defaultValue: 'queued'
      },
      collected_data: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      started_at: { type: Sequelize.DATE, allowNull: true },
      ended_at: { type: Sequelize.DATE, allowNull: true },
      duration_seconds: { type: Sequelize.INTEGER, allowNull: true },
      transcript: { type: Sequelize.TEXT, allowNull: true },
      summary: { type: Sequelize.TEXT, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('call_sessions', ['condominium_id']);
    await queryInterface.addIndex('call_sessions', ['status']);
    await queryInterface.addIndex('call_sessions', ['started_at']);

    // 8. call_logs
    await queryInterface.createTable('call_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      call_session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'call_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      condominium_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'condominiums', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: { type: Sequelize.STRING, allowNull: false },
      step_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'flow_steps', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      payload: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('call_logs', ['call_session_id']);
    await queryInterface.addIndex('call_logs', ['condominium_id']);

    // 9. audit_logs
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: { type: Sequelize.UUID, allowNull: true },
      action: { type: Sequelize.STRING, allowNull: false },
      resource: { type: Sequelize.STRING, allowNull: false },
      resource_id: { type: Sequelize.UUID, allowNull: true },
      method: { type: Sequelize.STRING, allowNull: false },
      endpoint: { type: Sequelize.STRING, allowNull: false },
      request_body: { type: Sequelize.JSON, allowNull: true },
      request_params: { type: Sequelize.JSON, allowNull: true },
      request_query: { type: Sequelize.JSON, allowNull: true },
      response_status: { type: Sequelize.INTEGER, allowNull: false },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);

    // 10. processed_events
    await queryInterface.createTable('processed_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      external_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      source: { type: Sequelize.STRING, allowNull: false },
      processed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // Seed: admin user (senha: Admin@2024)
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hashedPassword = await bcrypt.hash('Admin@2024', 10);

    await queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      name: 'Administrador',
      email: 'admin@cca.com.br',
      password_hash: hashedPassword,
      role: 'ADM',
      condominium_id: null,
      active: true,
      first_access: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('processed_events');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('call_logs');
    await queryInterface.dropTable('call_sessions');
    await queryInterface.dropTable('flow_steps');
    await queryInterface.dropTable('flows');
    await queryInterface.dropTable('residents');
    await queryInterface.dropTable('units');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('condominiums');
  }
};
