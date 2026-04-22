const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Unit = sequelize.define('Unit', {
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
  level1_value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level2_value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('occupied', 'vacant'),
    defaultValue: 'vacant'
  }
}, {
  tableName: 'units',
  underscored: true,
  timestamps: true
});

module.exports = Unit;
