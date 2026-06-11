require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'portaria_dev_2026',
    database: process.env.DB_NAME || 'portaria',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  // Espelha development. Necessário pra Jest (NODE_ENV=test) conseguir importar a
  // camada de models — criar a instância Sequelize não abre conexão (só authenticate()).
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'portaria_dev_2026',
    database: process.env.DB_NAME || 'portaria',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
};
