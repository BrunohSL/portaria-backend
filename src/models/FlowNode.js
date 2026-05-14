const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const FlowNode = sequelize.define('FlowNode', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  flow_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'flows', key: 'id' }
  },
  condominium_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'condominiums', key: 'id' }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  position_x: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  position_y: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'flow_nodes',
  underscored: true,
  timestamps: true
});

module.exports = FlowNode;
