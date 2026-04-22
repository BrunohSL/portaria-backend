const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Resident = sequelize.define('Resident', {
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
  unit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'units', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cpf: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone_2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('owner', 'tenant', 'dependent'),
    defaultValue: 'owner'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  can_authorize: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'residents',
  underscored: true,
  timestamps: true
});

module.exports = Resident;
