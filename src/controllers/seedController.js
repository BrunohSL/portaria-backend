const seedService = require('../services/seedService');

class SeedController {
  async populate(req, res) {
    try {
      const result = await seedService.populate(req.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

const controller = new SeedController();
module.exports = {
  populate: controller.populate.bind(controller)
};
