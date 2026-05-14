const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Flow = sequelize.define('Flow', {
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
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  entry_node_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'flow_nodes', key: 'id' }
  }
}, {
  tableName: 'flows',
  underscored: true,
  timestamps: true
});

module.exports = Flow;
