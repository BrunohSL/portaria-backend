const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Extension = sequelize.define('Extension', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'extensions',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['condominium_id', 'number'], name: 'uniq_extensions_condo_number' }
  ]
});

module.exports = Extension;
