const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  condominium_id: {
    type: DataTypes.INTEGER,
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
  }
}, {
  tableName: 'units',
  underscored: true,
  timestamps: true
});

module.exports = Unit;
