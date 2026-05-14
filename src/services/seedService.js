const sequelize = require('../config/sequelize');
const Condominium = require('../models/Condominium');
const Unit = require('../models/Unit');
const Contact = require('../models/Contact');
const Visitor = require('../models/Visitor');
const UnitVisitor = require('../models/UnitVisitor');
const Gate = require('../models/Gate');
const Extension = require('../models/Extension');
const PhoneNumber = require('../models/PhoneNumber');
const Flow = require('../models/Flow');
const FlowNode = require('../models/FlowNode');
const FlowEdge = require('../models/FlowEdge');
const Employee = require('../models/Employee');
const EmployeeShift = require('../models/EmployeeShift');
const logger = require('../config/logger');
const { buildSeedFlows } = require('./seedFlows');
const { buildSeedEmployees } = require('./seedEmployees');

class SeedService {
  /**
   * Popula o banco com dados de teste:
   * - 1 condomínio com fallback_extension
   * - 3 portões (gates) e 2 ramais (extensions)
   * - 12 unidades (A-F, 101-102)
   * - 8 contatos (apenas owner/resident) + 2 visitors (1 com autorização permanente)
   * - 7 fluxos (ROOT + VISITA_MORADOR completos, demais como stubs)
   * - 6 funcionários (síndico, zelador, 4 porteiros) com seus turnos
   *
   * Limpa os dados existentes antes de popular. CASCADE leva flow_nodes/edges junto.
   */
  async populate(callerId) {
    const transaction = await sequelize.transaction();
    try {
      // Ordem importa: filhos antes dos pais (respeitando FKs explicitas).
      await FlowEdge.destroy({ where: {}, transaction, force: true });
      // Limpar entry_node_id antes de FlowNode.destroy pra evitar conflito de FK
      await Flow.update({ entry_node_id: null }, { where: {}, transaction });
      await FlowNode.destroy({ where: {}, transaction, force: true });
      await Flow.destroy({ where: {}, transaction, force: true });
      await EmployeeShift.destroy({ where: {}, transaction, force: true });
      await Employee.destroy({ where: {}, transaction, force: true });
      await Contact.destroy({ where: {}, transaction, force: true });
      await UnitVisitor.destroy({ where: {}, transaction, force: true });
      await Visitor.destroy({ where: {}, transaction, force: true });
      await Unit.destroy({ where: {}, transaction, force: true });
      await Gate.destroy({ where: {}, transaction, force: true });
      await Extension.destroy({ where: {}, transaction, force: true });
      await PhoneNumber.destroy({ where: {}, transaction, force: true });
      await Condominium.destroy({ where: {}, transaction, force: true });

      await sequelize.query('ALTER TABLE flow_edges AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE flow_nodes AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE flows AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE contacts AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE unit_visitors AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE visitors AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE units AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE gates AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE extensions AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE phone_numbers AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE employees AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE employee_shifts AUTO_INCREMENT = 1', { transaction });
      await sequelize.query('ALTER TABLE condominiums AUTO_INCREMENT = 1', { transaction });

      const condo = await Condominium.create({
        name: 'Teste condomínio',
        cnpj: '16.926.045/0001-21',
        phone: '(19) 99321-6314',
        address: 'Nelson Rubini, 740',
        city: '3536505',
        state: 'São Paulo',
        zip_code: '13144-725',
        active: true,
        fallback_extension: '3010',
        level1_label: 'Bloco1',
        level2_label: 'Apto2',
        created_by: callerId
      }, { transaction });

      const flowsResult = await buildSeedFlows(condo.id, { transaction });

      await Gate.bulkCreate([
        { condominium_id: condo.id, slug: 'gate1', label: 'Porta Eclusa', dns: '127.0.0.1', brand: 'Intelbras', extension: '3011', position: 1, active: true },
        { condominium_id: condo.id, slug: 'gate2', label: 'Porta principal', dns: '127.0.0.1', brand: 'Intelbras', extension: '3012', position: 2, active: true },
        { condominium_id: condo.id, slug: 'gate3', label: 'Porta Hall', dns: '127.0.0.1', brand: 'Intelbras', extension: '3013', position: 3, active: true }
      ], { transaction });

      await Extension.bulkCreate([
        { condominium_id: condo.id, name: 'Portaria', number: '01', active: true },
        { condominium_id: condo.id, name: 'Salão de festas', number: '02', active: true }
      ], { transaction });

      await PhoneNumber.create({
        condominium_id: condo.id,
        e164_number: '+551926603062',
        provider: 'twilio',
        label: 'Número de teste Twilio (POC)',
        active: true
      }, { transaction });

      const blocos = ['A', 'B', 'C', 'D', 'E', 'F'];
      const apartamentos = ['101', '102'];
      const unitsData = [];
      for (const bloco of blocos) {
        for (const apto of apartamentos) {
          unitsData.push({
            condominium_id: condo.id,
            level1_value: bloco,
            level2_value: apto
          });
        }
      }
      const units = await Unit.bulkCreate(unitsData, { transaction });

      const contactsData = [
        { unit_idx: 0, name: 'Joao Silva', type: 'owner' },
        { unit_idx: 0, name: 'Maria Santos', type: 'resident' },
        { unit_idx: 2, name: 'Joao Silva', type: 'owner' },
        { unit_idx: 2, name: 'Maria Santos', type: 'resident' },
        { unit_idx: 4, name: 'Joao Silva', type: 'owner' },
        { unit_idx: 4, name: 'Maria Santos', type: 'resident' },
        { unit_idx: 6, name: 'Joao Silva', type: 'owner' },
        { unit_idx: 6, name: 'Maria Santos', type: 'resident' }
      ];

      await Contact.bulkCreate(contactsData.map((c) => ({
        condominium_id: condo.id,
        unit_id: units[c.unit_idx].id,
        name: c.name,
        phone: '19993216314',
        type: c.type
      })), { transaction });

      // Visitors: 1 com janela de autorização permanente (pai entra sempre na unidade 0)
      // e 1 sem janela (visita pontual já cadastrada)
      const longFromNow = new Date();
      const longUntil = new Date();
      longUntil.setFullYear(longUntil.getFullYear() + 5);

      const visitors = await Visitor.bulkCreate([
        {
          condominium_id: condo.id,
          name: 'Carlos Pai',
          cpf: '11122233344',
          phone: '19999990001',
          authorized_from: longFromNow,
          authorized_until: longUntil
        },
        {
          condominium_id: condo.id,
          name: 'Pedro Visitante',
          cpf: '55566677788',
          phone: '19999990002'
        }
      ], { transaction });

      await UnitVisitor.bulkCreate([
        { unit_id: units[0].id, visitor_id: visitors[0].id },
        { unit_id: units[2].id, visitor_id: visitors[1].id }
      ], { transaction });

      const employeesResult = await buildSeedEmployees(condo.id, { transaction });

      await transaction.commit();
      logger.info({ msg: 'Banco populado com dados de teste', condominiumId: condo.id, rootFlowId: flowsResult.rootFlowId });

      return {
        condominium: condo.id,
        rootFlow: flowsResult.rootFlowId,
        flows: flowsResult.flowsCreated,
        flowNodes: flowsResult.nodesCreated,
        flowEdges: flowsResult.edgesCreated,
        gates: 3,
        extensions: 2,
        units: units.length,
        contacts: contactsData.length,
        visitors: visitors.length,
        employees: employeesResult.employeesCreated,
        shifts: employeesResult.shiftsCreated
      };
    } catch (err) {
      await transaction.rollback();
      logger.error({ msg: 'Erro ao popular banco', error: err.message });
      throw err;
    }
  }
}

module.exports = new SeedService();
