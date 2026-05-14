const Extension = require('../models/Extension');
const logger = require('../config/logger');

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

class ExtensionService {
  async list(condominiumId) {
    return Extension.findAll({
      where: { condominium_id: condominiumId },
      order: [['name', 'ASC']]
    });
  }

  async create(condominiumId, data) {
    const extension = await Extension.create({
      condominium_id: condominiumId,
      name: data.name,
      number: String(data.number),
      active: data.active ?? true
    });
    logger.info({ msg: 'Extension criada', extensionId: extension.id, condominiumId });
    return extension;
  }

  async update(condominiumId, extensionId, data) {
    const extension = await Extension.findOne({ where: { id: extensionId, condominium_id: condominiumId } });
    if (!extension) throw notFound('Ramal não encontrado');
    await extension.update(data);
    return extension;
  }

  async delete(condominiumId, extensionId) {
    const extension = await Extension.findOne({ where: { id: extensionId, condominium_id: condominiumId } });
    if (!extension) throw notFound('Ramal não encontrado');
    await extension.destroy();
    return { message: 'Ramal excluído com sucesso' };
  }
}

module.exports = new ExtensionService();
