const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('ADM', 'CLIENT_ADM', 'SUPPORT'),
    allowNull: false
  },
  condominium_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'condominiums', key: 'id' }
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  first_access: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = User;
