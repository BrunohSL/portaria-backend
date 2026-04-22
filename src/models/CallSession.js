const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CallSession = sequelize.define('CallSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  condominium_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'condominiums', key: 'id' }
  },
  flow_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'flows', key: 'id' }
  },
  twilio_call_sid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  caller_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  current_step_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'flow_steps', key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('queued', 'in_progress', 'completed', 'failed', 'transferred', 'abandoned'),
    defaultValue: 'queued'
  },
  collected_data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  transcript: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'call_sessions',
  underscored: true,
  timestamps: true
});

module.exports = CallSession;
