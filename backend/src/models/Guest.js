const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Guest = sequelize.define(
    'Guest',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      eventId: { type: DataTypes.UUID, allowNull: false },
      nickname: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      photoCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isBanned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      userAgent: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'guests', timestamps: true }
  );

  Guest.prototype.toJSON = function () {
    const v = { ...this.get() };
    return v;
  };

  return Guest;
};
