const sequelize = require('../config/database');

// Importa e inicializa os models
const User = require('./User')(sequelize);
const Event = require('./Event')(sequelize);
const Guest = require('./Guest')(sequelize);
const Photo = require('./Photo')(sequelize);
const Plan = require('./Plan')(sequelize);
const AdminAuditLog = require('./AdminAuditLog')(sequelize);
const AccessLog = require('./AccessLog')(sequelize);
const BlockedIp = require('./BlockedIp')(sequelize);
const Commission = require('./Commission')(sequelize);

// ---------------------------------------------------------------------------
// Associacoes
// ---------------------------------------------------------------------------
User.hasMany(Event, { foreignKey: 'userId', as: 'events', onDelete: 'CASCADE' });
Event.belongsTo(User, { foreignKey: 'userId', as: 'organizer' });

Event.hasMany(Guest, { foreignKey: 'eventId', as: 'guests', onDelete: 'CASCADE' });
Guest.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Event.hasMany(Photo, { foreignKey: 'eventId', as: 'photos', onDelete: 'CASCADE' });
Photo.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Guest.hasMany(Photo, { foreignKey: 'guestId', as: 'photos', onDelete: 'CASCADE' });
Photo.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

Event.hasMany(Plan, { foreignKey: 'eventId', as: 'payments', onDelete: 'CASCADE' });
Plan.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(AdminAuditLog, { foreignKey: 'adminUserId', as: 'adminAuditLogs', onDelete: 'SET NULL' });
AdminAuditLog.belongsTo(User, { foreignKey: 'adminUserId', as: 'admin', onDelete: 'SET NULL' });

User.hasMany(AccessLog, { foreignKey: 'userId', as: 'accessLogs', onDelete: 'SET NULL' });
AccessLog.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });

BlockedIp.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy', onDelete: 'SET NULL' });

// ---------------------------------------------------------------------------
// Afiliados / Comissoes
// ---------------------------------------------------------------------------
// Auto-relacao: quem indicou quem
User.belongsTo(User, { foreignKey: 'referredByUserId', as: 'referredBy', onDelete: 'SET NULL' });
User.hasMany(User, { foreignKey: 'referredByUserId', as: 'referrals' });

// Comissoes recebidas pelo afiliado
User.hasMany(Commission, { foreignKey: 'affiliateUserId', as: 'earnedCommissions', onDelete: 'CASCADE' });
Commission.belongsTo(User, { foreignKey: 'affiliateUserId', as: 'affiliate' });

// Comissoes geradas pelas compras do indicado
Commission.belongsTo(User, { foreignKey: 'referredUserId', as: 'referred', onDelete: 'SET NULL' });

// Evento e cobranca de origem
Commission.belongsTo(Event, { foreignKey: 'eventId', as: 'event', onDelete: 'SET NULL' });
Commission.belongsTo(Plan, { foreignKey: 'paymentId', as: 'payment', onDelete: 'SET NULL' });

const db = {
  sequelize,
  Sequelize: sequelize.constructor,
  User,
  Event,
  Guest,
  Photo,
  Plan,
  AdminAuditLog,
  AccessLog,
  BlockedIp,
  Commission,
};

module.exports = db;
