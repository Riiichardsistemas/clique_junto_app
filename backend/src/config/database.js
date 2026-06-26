const path = require('path');
const { Sequelize } = require('sequelize');

/**
 * Configuracao do Sequelize.
 *
 * - Em producao (ou sempre que DATABASE_URL estiver definida): usa PostgreSQL.
 * - Em desenvolvimento sem DATABASE_URL: usa SQLite local (zero configuracao),
 *   gravando o arquivo em backend/database.sqlite.
 */

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  // PostgreSQL (producao ou dev apontando para Postgres)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: isProduction
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
} else {
  // SQLite local para desenvolvimento
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'database.sqlite'),
    logging: false,
  });
}

module.exports = sequelize;
