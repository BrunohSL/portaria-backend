const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  call_session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'call_sessions', key: 'id' }
  },
  condominium_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'condominiums', key: 'id' }
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  node_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'flow_nodes', key: 'id' }
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
