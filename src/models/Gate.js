const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Gate = sequelize.define('Gate', {
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
  slug: {
    type: DataTypes.STRING,
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dns: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  extension: {
    type: DataTypes.STRING,
    allowNull: true
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'gates',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['condominium_id', 'slug'], name: 'uniq_gates_condo_slug' }
  ]
});

module.exports = Gate;
