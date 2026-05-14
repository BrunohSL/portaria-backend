const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const FlowType = sequelize.define('FlowType', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_root: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'flow_types',
  underscored: true,
  timestamps: true
});

module.exports = FlowType;
