const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false
  },
  resource_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: false
  },
  request_body: {
    type: DataTypes.JSON,
    allowNull: true
  },
  request_params: {
    type: DataTypes.JSON,
    allowNull: true
  },
  request_query: {
    type: DataTypes.JSON,
    allowNull: true
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false
});

module.exports = AuditLog;
