const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const FlowEdge = sequelize.define('FlowEdge', {
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
  source_node_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'flow_nodes', key: 'id' }
  },
  source_handle: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default'
  },
  target_node_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'flow_nodes', key: 'id' }
  },
  target_handle: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default'
  }
}, {
  tableName: 'flow_edges',
  underscored: true,
  timestamps: true
});

module.exports = FlowEdge;
