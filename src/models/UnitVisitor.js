const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const UnitVisitor = sequelize.define('UnitVisitor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  unit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'units', key: 'id' }
  },
  visitor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'visitors', key: 'id' }
  }
}, {
  tableName: 'unit_visitors',
  underscored: true,
  timestamps: true,
  paranoid: true
});

module.exports = UnitVisitor;
