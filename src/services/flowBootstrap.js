const Flow = require('../models/Flow');
const FlowNode = require('../models/FlowNode');
const FlowEdge = require('../models/FlowEdge');

/**
 * Cria o fluxo ROOT (identificação de intenção) de um condomínio com um esqueleto
 * inicial: saudação → coleta de intenção. Usado tanto no condominiumService.create
 * quanto no seedService.populate pra garantir consistência.
 *
 * @param {number} condominiumId
 * @param {object} options
 * @param {object} options.transaction - transação Sequelize ativa (obrigatório)
 * @returns {Promise<Flow>} o fluxo ROOT criado
 */
async function bootstrapRootFlow(condominiumId, { transaction }) {
  const rootFlow = await Flow.create({
    condominium_id: condominiumId,
    name: 'Identificação de intenção',
    type: 'ROOT',
    active: true
  }, { transaction });

  const greeting = await FlowNode.create({
    flow_id: rootFlow.id,
    condominium_id: condominiumId,
    type: 'COMUNICACAO',
    config: { mode: 'tts', text: 'Olá! Em que posso ajudar?' },
    position_x: 80,
    position_y: 100
  }, { transaction });

  const intent = await FlowNode.create({
    flow_id: rootFlow.id,
    condominium_id: condominiumId,
    type: 'COLETAR_INTENCAO',
    config: { catalogKey: 'o_que_deseja', promptText: 'Identifique a intenção do visitante.' },
    position_x: 360,
    position_y: 100
  }, { transaction });

  await FlowEdge.create({
    flow_id: rootFlow.id,
    source_node_id: greeting.id,
    source_handle: 'default',
    target_node_id: intent.id,
    target_handle: 'default'
  }, { transaction });

  await rootFlow.update({ entry_node_id: greeting.id }, { transaction });

  return rootFlow;
}

module.exports = { bootstrapRootFlow };
