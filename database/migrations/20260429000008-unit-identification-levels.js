'use strict';

// Cria o catálogo de "níveis de identificação de unidade" (apto, bloco, lote, rua, quadra, número).
// Esses são usados em 2 lugares:
//  1. Configuração de infraestrutura do condomínio (campos level1_label/level2_label)
//  2. Catálogo de dados que podem ser coletados em COLETAR_DADOS_MORADOR / COLETAR_DADOS_VISITA
//
// Também remove os 5 duplicados que estavam em visitor_data_fields (bloco, apto, rua, lote, quadra).

const NEW_LEVELS = [
  { key: 'apto',    label: 'Apto',    description: 'Número do apartamento',           sort_order: 1 },
  { key: 'bloco',   label: 'Bloco',   description: 'Bloco/torre da unidade',          sort_order: 2 },
  { key: 'lote',    label: 'Lote',    description: 'Número do lote',                   sort_order: 3 },
  { key: 'rua',     label: 'Rua',     description: 'Nome/número da rua interna',       sort_order: 4 },
  { key: 'quadra',  label: 'Quadra',  description: 'Número da quadra',                 sort_order: 5 },
  { key: 'numero',  label: 'Número',  description: 'Numeração da residência',          sort_order: 6 }
];

const REMOVED_FROM_VISITOR_DATA_FIELDS = ['bloco', 'apto', 'lote', 'rua', 'quadra'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const TS = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };
    const now = new Date();

    // 1. Cria a tabela
    await queryInterface.createTable('unit_identification_levels', {
      key: { type: Sequelize.STRING(64), primaryKey: true },
      label: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: TS,
      updated_at: TS
    });

    // 2. Seed
    await queryInterface.bulkInsert('unit_identification_levels',
      NEW_LEVELS.map((l) => ({ ...l, active: true, created_at: now, updated_at: now }))
    );

    // 3. Remove duplicados de visitor_data_fields. Antes de deletar, valida se algum
    //    flow_node está referenciando esses keys em config.requestedFields (raro em dev,
    //    mas importante pra avisar — não bloqueamos por enquanto).
    const [referencingNodes] = await queryInterface.sequelize.query(
      `SELECT id, type, config FROM flow_nodes
        WHERE type IN ('COLETAR_DADOS_MORADOR', 'COLETAR_DADOS_VISITA')`
    );
    const stillReferenced = [];
    for (const node of referencingNodes) {
      const cfg = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
      const fields = cfg?.requestedFields ?? [];
      const overlap = fields.filter((f) => REMOVED_FROM_VISITOR_DATA_FIELDS.includes(f));
      if (overlap.length > 0) stillReferenced.push({ id: node.id, fields: overlap });
    }
    if (stillReferenced.length > 0) {
      console.warn(
        `[migration 20260429000008] ${stillReferenced.length} node(s) referenciam keys que serão removidas de visitor_data_fields:`,
        stillReferenced.map((n) => `node=${n.id} keys=${n.fields.join(',')}`).join('; '),
        '— atualize esses nodes pra usar as novas keys do unit_identification_levels.'
      );
    }

    await queryInterface.sequelize.query(
      'DELETE FROM visitor_data_fields WHERE `key` IN (:keys)',
      { replacements: { keys: REMOVED_FROM_VISITOR_DATA_FIELDS } }
    );
  },

  async down(queryInterface) {
    // Restaura os 5 campos que foram removidos
    const now = new Date();
    await queryInterface.bulkInsert('visitor_data_fields', [
      { key: 'bloco',   label: 'Bloco',  description: 'Bloco/torre da unidade visitada', active: true, sort_order: 7,  created_at: now, updated_at: now },
      { key: 'apto',    label: 'Apto',   description: 'Número do apartamento',           active: true, sort_order: 8,  created_at: now, updated_at: now },
      { key: 'rua',     label: 'Rua',    description: 'Nome/número da rua interna',      active: true, sort_order: 9,  created_at: now, updated_at: now },
      { key: 'lote',    label: 'Lote',   description: 'Número do lote',                  active: true, sort_order: 10, created_at: now, updated_at: now },
      { key: 'quadra',  label: 'Quadra', description: 'Número da quadra',                active: true, sort_order: 11, created_at: now, updated_at: now }
    ]);
    await queryInterface.dropTable('unit_identification_levels');
  }
};
