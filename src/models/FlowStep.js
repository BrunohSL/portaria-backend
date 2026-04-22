const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const FlowStep = sequelize.define('FlowStep', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  flow_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'flows', key: 'id' }
  },
  condominium_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'condominiums', key: 'id' }
  },
  step_order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'GREETING',
      'COLLECT_DATA',
      'VALIDATE_RESIDENT',
      'ASK_QUESTION',
      'OPEN_GATE',
      'TRANSFER_CALL',
      'END_CALL'
    ),
    allowNull: false
  },
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'flow_steps',
  underscored: true,
  timestamps: true
});

module.exports = FlowStep;
