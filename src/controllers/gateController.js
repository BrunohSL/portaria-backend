const gateService = require('../services/gateService');

function handle(promise, res, successStatus = 200) {
  return promise
    .then((data) => res.status(successStatus).json({ success: true, data }))
    .catch((error) => {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    });
}

module.exports = {
  list: (req, res) => handle(gateService.list(req.params.id), res),
  create: (req, res) => handle(gateService.create(req.params.id, req.body), res, 201),
  update: (req, res) => handle(gateService.update(req.params.id, req.params.gateId, req.body), res),
  delete: (req, res) => handle(gateService.delete(req.params.id, req.params.gateId), res)
};
