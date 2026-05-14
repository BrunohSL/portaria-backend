const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const EmployeeRole = sequelize.define('EmployeeRole', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'employee_roles',
  underscored: true,
  timestamps: true
});

module.exports = EmployeeRole;
