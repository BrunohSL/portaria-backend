const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Flow = sequelize.define('Flow', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'flows',
  underscored: true,
  timestamps: true
});

module.exports = Flow;
