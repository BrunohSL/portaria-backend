const extensionService = require('../services/extensionService');

function handle(promise, res, successStatus = 200) {
  return promise
    .then((data) => res.status(successStatus).json({ success: true, data }))
    .catch((error) => {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    });
}

module.exports = {
  list: (req, res) => handle(extensionService.list(req.params.id), res),
  create: (req, res) => handle(extensionService.create(req.params.id, req.body), res, 201),
  update: (req, res) => handle(extensionService.update(req.params.id, req.params.extensionId, req.body), res),
  delete: (req, res) => handle(extensionService.delete(req.params.id, req.params.extensionId), res)
};
