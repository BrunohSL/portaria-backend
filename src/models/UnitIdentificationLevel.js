const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const UnitIdentificationLevel = sequelize.define('UnitIdentificationLevel', {
  key: {
    type: DataTypes.STRING(64),
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
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'unit_identification_levels',
  underscored: true,
  timestamps: true
});

module.exports = UnitIdentificationLevel;
