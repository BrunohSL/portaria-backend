const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Visitor = sequelize.define('Visitor', {
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
  cpf: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rg: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  authorized_from: {
    type: DataTypes.DATE,
    allowNull: true
  },
  authorized_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'visitors',
  underscored: true,
  timestamps: true
});

module.exports = Visitor;
