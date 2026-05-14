const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ProcessedEvent = sequelize.define('ProcessedEvent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  external_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'processed_events',
  underscored: true,
  timestamps: true,
  updatedAt: false
});

module.exports = ProcessedEvent;
