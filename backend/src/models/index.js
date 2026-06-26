const sequelize = require('../config/database');

// Importa e inicializa os models
const User = require('./User')(sequelize);
const Event = require('./Event')(sequelize);
const Guest = require('./Guest')(sequelize);
const Photo = require('./Photo')(sequelize);
const Plan = require('./Plan')(sequelize);

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

const db = {
  sequelize,
  Sequelize: sequelize.constructor,
  User,
  Event,
  Guest,
  Photo,
  Plan,
};

module.exports = db;
