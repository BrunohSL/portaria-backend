const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const EmployeeShift = sequelize.define('EmployeeShift', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('WEEKLY', 'ROTATION'),
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  days_of_week: {
    type: DataTypes.JSON,
    allowNull: true
  },
  rotation_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  rotation_period_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'employee_shifts',
  underscored: true,
  timestamps: true
});

module.exports = EmployeeShift;
