const { DataTypes } = require('sequelize');
const { FILTERS } = require('../config/constants');

module.exports = (sequelize) => {
  const Photo = sequelize.define(
    'Photo',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      eventId: { type: DataTypes.UUID, allowNull: false },
      guestId: { type: DataTypes.UUID, allowNull: false },
      // Chave/identificador no storage (S3 key ou caminho local relativo)
      storageKey: { type: DataTypes.STRING, allowNull: false },
      thumbKey: { type: DataTypes.STRING, allowNull: true },
      // 'photo' | 'video'
      mediaType: { type: DataTypes.ENUM('photo', 'video'), allowNull: false, defaultValue: 'photo' },
      durationSeconds: { type: DataTypes.FLOAT, allowNull: true },
      filter: { type: DataTypes.ENUM(...FILTERS), allowNull: false, defaultValue: 'nenhum' },
      width: { type: DataTypes.INTEGER, allowNull: true },
      height: { type: DataTypes.INTEGER, allowNull: true },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: true },
      // Controla a revelacao
      isVisible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'photos', timestamps: true }
  );

  return Photo;
};
