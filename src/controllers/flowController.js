const flowService = require('../services/flowService');

function handle(promise, res, successStatus = 200) {
  return promise
    .then((data) => res.status(successStatus).json({ success: true, data }))
    .catch((error) => {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    });
}

class FlowController {
  list(req, res) {
    return handle(flowService.list(req.params.id), res);
  }

  getById(req, res) {
    return handle(flowService.getById(req.params.id, req.params.flowId), res);
  }

  create(req, res) {
    return handle(flowService.create(req.params.id, req.body), res, 201);
  }

  update(req, res) {
    return handle(flowService.update(req.params.id, req.params.flowId, req.body), res);
  }

  delete(req, res) {
    return handle(flowService.delete(req.params.id, req.params.flowId), res);
  }

  validate(req, res) {
    return handle(flowService.validate(req.params.id, req.params.flowId), res);
  }

  setEntryNode(req, res) {
    return handle(flowService.setEntryNode(req.params.id, req.params.flowId, req.body.nodeId), res);
  }

  // Nodes
  listNodes(req, res) {
    return handle(flowService.listNodes(req.params.id, req.params.flowId), res);
  }

  createNode(req, res) {
    return handle(flowService.createNode(req.params.id, req.params.flowId, req.body), res, 201);
  }

  updateNode(req, res) {
    return handle(flowService.updateNode(req.params.id, req.params.flowId, req.params.nodeId, req.body), res);
  }

  deleteNode(req, res) {
    return handle(flowService.deleteNode(req.params.id, req.params.flowId, req.params.nodeId), res);
  }

  // Edges
  createEdge(req, res) {
    return handle(flowService.createEdge(req.params.id, req.params.flowId, req.body), res, 201);
  }

  deleteEdge(req, res) {
    return handle(flowService.deleteEdge(req.params.id, req.params.flowId, req.params.edgeId), res);
  }
}

const controller = new FlowController();
module.exports = {
  list: controller.list.bind(controller),
  getById: controller.getById.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  validate: controller.validate.bind(controller),
  setEntryNode: controller.setEntryNode.bind(controller),
  listNodes: controller.listNodes.bind(controller),
  createNode: controller.createNode.bind(controller),
  updateNode: controller.updateNode.bind(controller),
  deleteNode: controller.deleteNode.bind(controller),
  createEdge: controller.createEdge.bind(controller),
  deleteEdge: controller.deleteEdge.bind(controller)
};
