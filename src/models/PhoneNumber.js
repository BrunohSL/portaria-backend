const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PhoneNumber = sequelize.define('PhoneNumber', {
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
  e164_number: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'twilio'
  },
  label: {
    type: DataTypes.STRING,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'phone_numbers',
  underscored: true,
  timestamps: true
});

module.exports = PhoneNumber;
