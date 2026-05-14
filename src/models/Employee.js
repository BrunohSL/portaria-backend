const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Employee = sequelize.define('Employee', {
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
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employee_roles', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  can_authorize_access: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  emergency_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  emergency_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'employees',
  underscored: true,
  timestamps: true
});

module.exports = Employee;
