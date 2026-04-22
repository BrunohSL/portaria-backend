const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Condominium = sequelize.define('Condominium', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cnpj: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zip_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  twilio_phone_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fallback_extension: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gates_config: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  extensions_config: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  level1_label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Bloco'
  },
  level2_label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Apto'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'condominiums',
  underscored: true,
  timestamps: true
});

module.exports = Condominium;
