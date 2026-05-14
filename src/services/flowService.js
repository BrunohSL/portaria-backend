const Flow = require('../models/Flow');
const FlowNode = require('../models/FlowNode');
const FlowEdge = require('../models/FlowEdge');
const sequelize = require('../config/sequelize');
const logger = require('../config/logger');
const { isValidType, getOutputHandles, getRequiredOutputHandles, isRestrictedToFlowType } = require('../constants/nodeTypes');
const { isValidFlowType, FLOW_TYPES } = require('../constants/flowTypes');

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

class FlowService {
  async list(condominiumId) {
    return Flow.findAll({
      where: { condominium_id: condominiumId },
      order: [['name', 'ASC']]
    });
  }

  async getById(condominiumId, flowId) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId },
      include: [
        { model: FlowNode, as: 'nodes' },
        { model: FlowEdge, as: 'edges' }
      ]
    });

    if (!flow) throw notFound('Fluxo nao encontrado');
    return flow;
  }

  async create(condominiumId, data) {
    if (!data.type || !isValidFlowType(data.type)) {
      throw badRequest(`Tipo de fluxo inválido: ${data.type}. Use um de: ${Object.keys(FLOW_TYPES).join(', ')}`);
    }
    if (data.type === 'ROOT') {
      throw badRequest('Fluxo ROOT é criado automaticamente quando o condomínio é cadastrado');
    }
    const existing = await Flow.findOne({ where: { condominium_id: condominiumId, type: data.type } });
    if (existing) {
      throw badRequest(`Já existe um fluxo do tipo ${data.type} neste condomínio`);
    }

    const flow = await Flow.create({
      ...data,
      condominium_id: condominiumId
    });

    logger.info({ msg: 'Fluxo criado', flowId: flow.id, condominiumId, type: flow.type });
    return flow;
  }

  async update(condominiumId, flowId, data) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId }
    });
    if (!flow) throw notFound('Fluxo nao encontrado');

    await flow.update(data);
    logger.info({ msg: 'Fluxo atualizado', flowId, condominiumId });
    return flow;
  }

  async delete(condominiumId, flowId) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId }
    });
    if (!flow) throw notFound('Fluxo nao encontrado');
    if (flow.type === 'ROOT') {
      throw badRequest('Fluxo ROOT não pode ser excluído. Ele é gerenciado pelo sistema.');
    }

    const transaction = await sequelize.transaction();
    try {
      await FlowEdge.destroy({ where: { flow_id: flowId }, transaction });
      await flow.update({ entry_node_id: null }, { transaction });
      await FlowNode.destroy({ where: { flow_id: flowId }, transaction });
      await flow.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    logger.info({ msg: 'Fluxo excluido', flowId, condominiumId });
    return { message: 'Fluxo excluido com sucesso' };
  }

  // ======================
  // Nodes
  // ======================

  async listNodes(condominiumId, flowId) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) throw notFound('Fluxo nao encontrado');

    return FlowNode.findAll({ where: { flow_id: flowId }, order: [['id', 'ASC']] });
  }

  async createNode(condominiumId, flowId, data) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) throw notFound('Fluxo nao encontrado');
    if (!isValidType(data.type)) throw badRequest(`Tipo de node inválido: ${data.type}`);

    const restricted = isRestrictedToFlowType(data.type);
    if (restricted && !restricted.includes(flow.type)) {
      throw badRequest(`Node ${data.type} só pode ser usado em fluxos do tipo: ${restricted.join(', ')}`);
    }

    const node = await FlowNode.create({
      flow_id: flowId,
      condominium_id: condominiumId,
      type: data.type,
      config: data.config ?? {},
      position_x: data.position_x ?? null,
      position_y: data.position_y ?? null
    });

    logger.info({ msg: 'Node criado', nodeId: node.id, flowId, type: node.type });
    return node;
  }

  async updateNode(condominiumId, flowId, nodeId, data) {
    const node = await FlowNode.findOne({
      where: { id: nodeId, flow_id: flowId, condominium_id: condominiumId }
    });
    if (!node) throw notFound('Node nao encontrado');

    if (data.type && !isValidType(data.type)) {
      throw badRequest(`Tipo de node inválido: ${data.type}`);
    }

    await node.update(data);
    logger.info({ msg: 'Node atualizado', nodeId, flowId });
    return node;
  }

  async deleteNode(condominiumId, flowId, nodeId) {
    const node = await FlowNode.findOne({
      where: { id: nodeId, flow_id: flowId, condominium_id: condominiumId }
    });
    if (!node) throw notFound('Node nao encontrado');

    const flow = await Flow.findByPk(flowId);
    const transaction = await sequelize.transaction();
    try {
      if (flow.entry_node_id === nodeId) {
        await flow.update({ entry_node_id: null }, { transaction });
      }
      await FlowEdge.destroy({
        where: {
          flow_id: flowId,
          [sequelize.Sequelize.Op.or]: [{ source_node_id: nodeId }, { target_node_id: nodeId }]
        },
        transaction
      });
      await node.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    logger.info({ msg: 'Node excluido', nodeId, flowId });
    return { message: 'Node excluido com sucesso' };
  }

  // ======================
  // Edges
  // ======================

  async createEdge(condominiumId, flowId, data) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) throw notFound('Fluxo nao encontrado');

    const [source, target] = await Promise.all([
      FlowNode.findOne({ where: { id: data.source_node_id, flow_id: flowId } }),
      FlowNode.findOne({ where: { id: data.target_node_id, flow_id: flowId } })
    ]);
    if (!source) throw badRequest('Source node não pertence a este fluxo');
    if (!target) throw badRequest('Target node não pertence a este fluxo');

    const sourceHandle = data.source_handle || 'default';
    const validHandles = getOutputHandles(source.type, source.config);
    if (!validHandles.includes(sourceHandle)) {
      throw badRequest(`Handle de saída '${sourceHandle}' inválido para ${source.type}. Válidos: ${validHandles.join(', ')}`);
    }

    const existing = await FlowEdge.findOne({
      where: { flow_id: flowId, source_node_id: source.id, source_handle: sourceHandle }
    });
    if (existing) {
      throw badRequest(`Saída '${sourceHandle}' do node ${source.id} já está conectada`);
    }

    const edge = await FlowEdge.create({
      flow_id: flowId,
      source_node_id: source.id,
      source_handle: sourceHandle,
      target_node_id: target.id,
      target_handle: data.target_handle || 'default'
    });

    logger.info({ msg: 'Edge criada', edgeId: edge.id, flowId });
    return edge;
  }

  async deleteEdge(condominiumId, flowId, edgeId) {
    const edge = await FlowEdge.findOne({
      where: { id: edgeId, flow_id: flowId },
      include: [{ model: FlowNode, as: 'sourceNode', where: { condominium_id: condominiumId } }]
    });
    if (!edge) throw notFound('Edge nao encontrada');

    await edge.destroy();
    logger.info({ msg: 'Edge excluida', edgeId, flowId });
    return { message: 'Edge excluida com sucesso' };
  }

  // ======================
  // Validação do fluxo (todos os handles obrigatórios conectados, entry_node definido)
  // ======================

  async validate(condominiumId, flowId) {
    const flow = await this.getById(condominiumId, flowId);

    const errors = [];

    if (!flow.entry_node_id) {
      errors.push({ code: 'NO_ENTRY_NODE', message: 'Fluxo não tem node de entrada definido' });
    }

    const edges = flow.edges ?? [];
    const edgesBySource = new Map();
    for (const e of edges) {
      const key = `${e.source_node_id}:${e.source_handle}`;
      edgesBySource.set(key, e);
    }

    for (const node of flow.nodes ?? []) {
      const required = getRequiredOutputHandles(node.type, node.config);
      for (const handle of required) {
        const key = `${node.id}:${handle}`;
        if (!edgesBySource.has(key)) {
          errors.push({
            code: 'REQUIRED_HANDLE_UNCONNECTED',
            message: `Node ${node.id} (${node.type}) tem saída obrigatória '${handle}' não conectada`,
            nodeId: node.id,
            handle
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async setEntryNode(condominiumId, flowId, nodeId) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) throw notFound('Fluxo nao encontrado');

    const node = await FlowNode.findOne({ where: { id: nodeId, flow_id: flowId } });
    if (!node) throw badRequest('Node não pertence a este fluxo');

    await flow.update({ entry_node_id: node.id });
    return flow;
  }
}

module.exports = new FlowService();
