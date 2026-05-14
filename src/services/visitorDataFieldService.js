const VisitorDataField = require('../models/VisitorDataField');

class VisitorDataFieldService {
  async list({ activeOnly = true } = {}) {
    const where = activeOnly ? { active: true } : {};
    return VisitorDataField.findAll({
      where,
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });
  }
}

module.exports = new VisitorDataFieldService();
