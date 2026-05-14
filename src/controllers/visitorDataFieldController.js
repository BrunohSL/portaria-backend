const visitorDataFieldService = require('../services/visitorDataFieldService');

function handle(promise, res, successStatus = 200) {
  return promise
    .then((data) => res.status(successStatus).json({ success: true, data }))
    .catch((error) => {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    });
}

module.exports = {
  list: (req, res) => handle(visitorDataFieldService.list({ activeOnly: req.query.activeOnly !== 'false' }), res)
};
