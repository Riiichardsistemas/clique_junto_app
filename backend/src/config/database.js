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

function shouldUseSsl(connectionUrl) {
  const configuredMode = String(process.env.DATABASE_SSL || 'auto').toLowerCase();

  if (configuredMode === 'disable' || configuredMode === 'false') return false;
  if (configuredMode === 'require' || configuredMode === 'true') return true;

  try {
    const sslMode = new URL(connectionUrl).searchParams.get('sslmode');
    if (sslMode === 'disable') return false;
    if (sslMode && sslMode !== 'prefer' && sslMode !== 'allow') return true;
  } catch (_error) {
    // O Sequelize exibira uma mensagem de conexao adequada caso a URL seja invalida.
  }

  return isProduction;
}

let sequelize;

if (databaseUrl) {
  // PostgreSQL (producao ou dev apontando para Postgres)
  const useSsl = shouldUseSsl(databaseUrl);
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
          },
        }
      : {},
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
} else {
  // SQLite local para desenvolvimento
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_STORAGE || path.join(__dirname, '..', '..', 'database.sqlite'),
    logging: false,
  });
}

module.exports = sequelize;
