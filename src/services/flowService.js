const Flow = require('../models/Flow');
const FlowStep = require('../models/FlowStep');
const logger = require('../config/logger');

class FlowService {
  async list(condominiumId) {
    const flows = await Flow.findAll({
      where: { condominium_id: condominiumId },
      include: [
        { model: FlowStep, as: 'steps', attributes: ['id', 'step_order', 'type'], order: [['step_order', 'ASC']] }
      ],
      order: [['name', 'ASC']]
    });
    return flows;
  }

  async getById(condominiumId, flowId) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId },
      include: [
        { model: FlowStep, as: 'steps', order: [['step_order', 'ASC']] }
      ]
    });

    if (!flow) {
      const error = new Error('Fluxo nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return flow;
  }

  async create(condominiumId, data) {
    const flow = await Flow.create({
      ...data,
      condominium_id: condominiumId
    });

    logger.info({ msg: 'Fluxo criado', flowId: flow.id, condominiumId });
    return flow;
  }

  async update(condominiumId, flowId, data) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId }
    });

    if (!flow) {
      const error = new Error('Fluxo nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await flow.update(data);

    logger.info({ msg: 'Fluxo atualizado', flowId, condominiumId });
    return flow;
  }

  async delete(condominiumId, flowId) {
    const flow = await Flow.findOne({
      where: { id: flowId, condominium_id: condominiumId }
    });

    if (!flow) {
      const error = new Error('Fluxo nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Excluir steps associados
    await FlowStep.destroy({ where: { flow_id: flowId } });
    await flow.destroy();

    logger.info({ msg: 'Fluxo excluido', flowId, condominiumId });
    return { message: 'Fluxo excluido com sucesso' };
  }

  // Flow Steps
  async listSteps(condominiumId, flowId) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) {
      const error = new Error('Fluxo nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    const steps = await FlowStep.findAll({
      where: { flow_id: flowId },
      order: [['step_order', 'ASC']]
    });
    return steps;
  }

  async createStep(condominiumId, flowId, data) {
    const flow = await Flow.findOne({ where: { id: flowId, condominium_id: condominiumId } });
    if (!flow) {
      const error = new Error('Fluxo nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Determinar proxima ordem
    const maxStep = await FlowStep.max('step_order', { where: { flow_id: flowId } });
    const stepOrder = data.step_order || (maxStep ? maxStep + 1 : 1);

    const step = await FlowStep.create({
      ...data,
      flow_id: flowId,
      condominium_id: condominiumId,
      step_order: stepOrder
    });

    logger.info({ msg: 'Step criado', stepId: step.id, flowId });
    return step;
  }

  async updateStep(condominiumId, flowId, stepId, data) {
    const step = await FlowStep.findOne({
      where: { id: stepId, flow_id: flowId, condominium_id: condominiumId }
    });

    if (!step) {
      const error = new Error('Step nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await step.update(data);

    logger.info({ msg: 'Step atualizado', stepId, flowId });
    return step;
  }

  async deleteStep(condominiumId, flowId, stepId) {
    const step = await FlowStep.findOne({
      where: { id: stepId, flow_id: flowId, condominium_id: condominiumId }
    });

    if (!step) {
      const error = new Error('Step nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await step.destroy();

    // Reordenar steps restantes
    const remaining = await FlowStep.findAll({
      where: { flow_id: flowId },
      order: [['step_order', 'ASC']]
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].step_order !== i + 1) {
        await remaining[i].update({ step_order: i + 1 });
      }
    }

    logger.info({ msg: 'Step excluido', stepId, flowId });
    return { message: 'Step excluido com sucesso' };
  }
}

module.exports = new FlowService();
