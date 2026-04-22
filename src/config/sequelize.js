const { Sequelize } = require('sequelize');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: {
      connectTimeout: 10000,
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3
    }
  }
);

module.exports = sequelize;
