const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  call_session_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'call_sessions', key: 'id' }
  },
  condominium_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'condominiums', key: 'id' }
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  step_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'flow_steps', key: 'id' }
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'call_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false
});

module.exports = CallLog;
