'use strict';

// Schema inicial consolidado. Substitui todas as migrations anteriores
// (que foram absorvidas aqui após o reset em 2026-04-29).

const bcrypt = require('bcryptjs');
const { FLOW_TYPES } = require('../../src/constants/flowTypes');

module.exports = {
  async up(queryInterface, Sequelize) {
    const ID = { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true };
    const FK = (model) => ({ type: Sequelize.INTEGER, allowNull: false, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    const FK_NULL = (model) => ({ type: Sequelize.INTEGER, allowNull: true, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    const TS = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };
    const now = new Date();

    // ===========================
    // 1. condominiums
    // ===========================
    await queryInterface.createTable('condominiums', {
      id: ID,
      name: { type: Sequelize.STRING, allowNull: false },
      cnpj: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING, allowNull: true },
      state: { type: Sequelize.STRING, allowNull: true },
      zip_code: { type: Sequelize.STRING, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      fallback_extension: { type: Sequelize.STRING, allowNull: true },
      level1_label: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Bloco' },
      level2_label: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Apto' },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: TS,
      updated_at: TS
    });

    // ===========================
    // 2. users
    // ===========================
    await queryInterface.createTable('users', {
      id: ID,
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash: { type: Sequelize.TEXT, allowNull: false },
      role: { type: Sequelize.ENUM('ADM', 'CLIENT_ADM', 'SUPPORT'), allowNull: false },
      condominium_id: FK_NULL('condominiums'),
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      first_access: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: TS,
      updated_at: TS,
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    // ===========================
    // 3. units
    // ===========================
    await queryInterface.createTable('units', {
      id: ID,
      condominium_id: FK('condominiums'),
      level1_value: { type: Sequelize.STRING, allowNull: false },
      level2_value: { type: Sequelize.STRING, allowNull: false },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('units', ['condominium_id', 'level1_value', 'level2_value'], { unique: true });

    // ===========================
    // 4. contacts
    // ===========================
    await queryInterface.createTable('contacts', {
      id: ID,
      condominium_id: FK('condominiums'),
      unit_id: FK_NULL('units'),
      name: { type: Sequelize.STRING, allowNull: false },
      cpf: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      phone_2: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.ENUM('owner', 'resident', 'visitor'), defaultValue: 'resident' },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      can_authorize: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('contacts', ['condominium_id']);
    await queryInterface.addIndex('contacts', ['unit_id']);

    // ===========================
    // 5. employee_roles + seed
    // ===========================
    await queryInterface.createTable('employee_roles', {
      id: ID,
      key: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      label: { type: Sequelize.STRING, allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.bulkInsert('employee_roles', [
      { key: 'sindico',   label: 'Sindico',   active: true, created_at: now, updated_at: now },
      { key: 'faxineira', label: 'Faxineira', active: true, created_at: now, updated_at: now },
      { key: 'porteiro',  label: 'Porteiro',  active: true, created_at: now, updated_at: now },
      { key: 'zelador',   label: 'Zelador',   active: true, created_at: now, updated_at: now }
    ]);

    // ===========================
    // 6. employees
    // ===========================
    await queryInterface.createTable('employees', {
      id: ID,
      condominium_id: FK('condominiums'),
      role_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employee_roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      can_authorize_access: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      emergency_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      emergency_phone: { type: Sequelize.STRING, allowNull: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('employees', ['condominium_id']);
    await queryInterface.addIndex('employees', ['role_id']);

    // ===========================
    // 7. employee_shifts
    // ===========================
    await queryInterface.createTable('employee_shifts', {
      id: ID,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('WEEKLY', 'ROTATION'), allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      days_of_week: { type: Sequelize.JSON, allowNull: true }, // array [0..6] (0=domingo)
      rotation_start_date: { type: Sequelize.DATEONLY, allowNull: true },
      rotation_period_days: { type: Sequelize.INTEGER, allowNull: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('employee_shifts', ['employee_id']);

    // ===========================
    // 8. gates
    // ===========================
    await queryInterface.createTable('gates', {
      id: ID,
      condominium_id: FK('condominiums'),
      slug: { type: Sequelize.STRING, allowNull: false },
      label: { type: Sequelize.STRING, allowNull: false },
      dns: { type: Sequelize.STRING, allowNull: true },
      brand: { type: Sequelize.STRING, allowNull: true },
      extension: { type: Sequelize.STRING, allowNull: true },
      position: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('gates', ['condominium_id']);
    await queryInterface.addConstraint('gates', { fields: ['condominium_id', 'slug'], type: 'unique', name: 'uniq_gates_condo_slug' });

    // ===========================
    // 9. extensions
    // ===========================
    await queryInterface.createTable('extensions', {
      id: ID,
      condominium_id: FK('condominiums'),
      name: { type: Sequelize.STRING, allowNull: false },
      number: { type: Sequelize.STRING, allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('extensions', ['condominium_id']);
    await queryInterface.addConstraint('extensions', { fields: ['condominium_id', 'number'], type: 'unique', name: 'uniq_extensions_condo_number' });

    // ===========================
    // 10. flow_types + seed
    // ===========================
    await queryInterface.createTable('flow_types', {
      key: { type: Sequelize.STRING, primaryKey: true },
      label: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      is_root: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.bulkInsert('flow_types', Object.entries(FLOW_TYPES).map(([key, def], idx) => ({
      key,
      label: def.label,
      description: def.description ?? null,
      is_root: !!def.isRoot,
      sort_order: idx,
      created_at: now,
      updated_at: now
    })));

    // ===========================
    // 11. flows (sem entry_node_id ainda — adicionado depois de flow_nodes)
    // ===========================
    await queryInterface.createTable('flows', {
      id: ID,
      condominium_id: FK('condominiums'),
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false, references: { model: 'flow_types', key: 'key' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('flows', ['condominium_id']);
    await queryInterface.addConstraint('flows', { fields: ['condominium_id', 'type'], type: 'unique', name: 'uniq_flows_condo_type' });

    // ===========================
    // 12. flow_nodes
    // ===========================
    await queryInterface.createTable('flow_nodes', {
      id: ID,
      flow_id: FK('flows'),
      condominium_id: FK('condominiums'),
      type: { type: Sequelize.STRING, allowNull: false },
      config: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      position_x: { type: Sequelize.FLOAT, allowNull: true },
      position_y: { type: Sequelize.FLOAT, allowNull: true },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('flow_nodes', ['flow_id']);
    await queryInterface.addIndex('flow_nodes', ['condominium_id']);
    await queryInterface.addIndex('flow_nodes', ['type']);

    // ===========================
    // 13. flow_edges
    // ===========================
    await queryInterface.createTable('flow_edges', {
      id: ID,
      flow_id: FK('flows'),
      source_node_id: FK('flow_nodes'),
      source_handle: { type: Sequelize.STRING, allowNull: false, defaultValue: 'default' },
      target_node_id: FK('flow_nodes'),
      target_handle: { type: Sequelize.STRING, allowNull: false, defaultValue: 'default' },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('flow_edges', ['flow_id']);
    await queryInterface.addIndex('flow_edges', ['source_node_id']);
    await queryInterface.addIndex('flow_edges', ['target_node_id']);
    await queryInterface.addConstraint('flow_edges', { fields: ['source_node_id', 'source_handle'], type: 'unique', name: 'uniq_flow_edges_source_handle' });

    // ===========================
    // 14. flows.entry_node_id (FK pra flow_nodes — só pode adicionar agora)
    // ===========================
    await queryInterface.addColumn('flows', 'entry_node_id', FK_NULL('flow_nodes'));

    // ===========================
    // 15. call_sessions
    // ===========================
    await queryInterface.createTable('call_sessions', {
      id: ID,
      condominium_id: FK('condominiums'),
      flow_id: FK_NULL('flows'),
      twilio_call_sid: { type: Sequelize.STRING, allowNull: true, unique: true },
      caller_number: { type: Sequelize.STRING, allowNull: false },
      current_node_id: FK_NULL('flow_nodes'),
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
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.addIndex('call_sessions', ['condominium_id']);
    await queryInterface.addIndex('call_sessions', ['status']);
    await queryInterface.addIndex('call_sessions', ['started_at']);

    // ===========================
    // 16. call_logs
    // ===========================
    await queryInterface.createTable('call_logs', {
      id: ID,
      call_session_id: FK('call_sessions'),
      condominium_id: FK('condominiums'),
      event_type: { type: Sequelize.STRING, allowNull: false },
      node_id: FK_NULL('flow_nodes'),
      payload: { type: Sequelize.JSON, allowNull: true },
      created_at: TS
    });
    await queryInterface.addIndex('call_logs', ['call_session_id']);
    await queryInterface.addIndex('call_logs', ['condominium_id']);

    // ===========================
    // 17. audit_logs
    // ===========================
    await queryInterface.createTable('audit_logs', {
      id: ID,
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      action: { type: Sequelize.STRING, allowNull: false },
      resource: { type: Sequelize.STRING, allowNull: false },
      resource_id: { type: Sequelize.INTEGER, allowNull: true },
      method: { type: Sequelize.STRING, allowNull: false },
      endpoint: { type: Sequelize.STRING, allowNull: false },
      request_body: { type: Sequelize.JSON, allowNull: true },
      request_params: { type: Sequelize.JSON, allowNull: true },
      request_query: { type: Sequelize.JSON, allowNull: true },
      response_status: { type: Sequelize.INTEGER, allowNull: false },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: TS
    });
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);

    // ===========================
    // 18. processed_events
    // ===========================
    await queryInterface.createTable('processed_events', {
      id: ID,
      external_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      source: { type: Sequelize.STRING, allowNull: false },
      processed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: TS
    });

    // ===========================
    // 19. visitor_data_fields + seed
    // ===========================
    await queryInterface.createTable('visitor_data_fields', {
      id: ID,
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      label: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: TS,
      updated_at: TS
    });
    await queryInterface.bulkInsert('visitor_data_fields', [
      { key: 'nome',      label: 'Nome',     description: 'Nome completo do visitante',           active: true, sort_order: 1,  created_at: now, updated_at: now },
      { key: 'cpf',       label: 'CPF',      description: '11 dígitos. Aceita "12345678901", "123.456.789-01" ou ditado em sequência ("1 2 3 4 5 6 7 8 9 0 1"). Normalize pra 11 dígitos sem pontuação.', active: true, sort_order: 2,  created_at: now, updated_at: now },
      { key: 'rg',        label: 'RG',       description: 'Documento de identidade. Tipicamente 7-10 dígitos, pode ter letra ao final. Normalize pra dígitos sem pontuação.', active: true, sort_order: 3,  created_at: now, updated_at: now },
      { key: 'empresa',   label: 'Empresa',  description: 'Empresa que o visitante representa',   active: true, sort_order: 4,  created_at: now, updated_at: now },
      { key: 'pacote',    label: 'Pacote',   description: 'Identificação do pacote a ser entregue', active: true, sort_order: 5,  created_at: now, updated_at: now },
      { key: 'refeicao',  label: 'Refeição', description: 'Identificação da refeição a ser entregue', active: true, sort_order: 6,  created_at: now, updated_at: now },
      { key: 'bloco',     label: 'Bloco',    description: 'Bloco/torre da unidade visitada',       active: true, sort_order: 7,  created_at: now, updated_at: now },
      { key: 'apto',      label: 'Apto',     description: 'Número do apartamento',                 active: true, sort_order: 8,  created_at: now, updated_at: now },
      { key: 'rua',       label: 'Rua',      description: 'Nome/número da rua interna',            active: true, sort_order: 9,  created_at: now, updated_at: now },
      { key: 'lote',      label: 'Lote',     description: 'Número do lote',                        active: true, sort_order: 10, created_at: now, updated_at: now },
      { key: 'quadra',    label: 'Quadra',   description: 'Número da quadra',                      active: true, sort_order: 11, created_at: now, updated_at: now }
    ]);

    // ===========================
    // 20. Seed: admin user (senha: p0rt4r1@2026)
    // ===========================
    const hashedPassword = await bcrypt.hash('p0rt4r1@2026', 10);
    await queryInterface.bulkInsert('users', [{
      name: 'Administrador',
      email: 'adm@portaria.com',
      password_hash: hashedPassword,
      role: 'ADM',
      condominium_id: null,
      active: true,
      first_access: false,
      created_at: now,
      updated_at: now
    }]);
  },

  async down(queryInterface) {
    // Ordem inversa, respeitando FKs
    await queryInterface.dropTable('visitor_data_fields');
    await queryInterface.dropTable('processed_events');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('call_logs');
    await queryInterface.dropTable('call_sessions');
    // entry_node_id em flows referencia flow_nodes; precisa quebrar antes
    await queryInterface.removeColumn('flows', 'entry_node_id');
    await queryInterface.dropTable('flow_edges');
    await queryInterface.dropTable('flow_nodes');
    await queryInterface.dropTable('flows');
    await queryInterface.dropTable('flow_types');
    await queryInterface.dropTable('extensions');
    await queryInterface.dropTable('gates');
    await queryInterface.dropTable('employee_shifts');
    await queryInterface.dropTable('employees');
    await queryInterface.dropTable('employee_roles');
    await queryInterface.dropTable('contacts');
    await queryInterface.dropTable('units');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('condominiums');
  }
};
