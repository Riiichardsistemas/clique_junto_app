const { DataTypes } = require('sequelize');

/**
 * IPs bloqueados manualmente pelo super admin.
 * Um middleware consulta um cache em memória desta tabela e recusa
 * requisições vindas destes endereços com 403.
 */
module.exports = (sequelize) => {
  const BlockedIp = sequelize.define(
    'BlockedIp',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      ip: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      reason: { type: DataTypes.STRING(180), allowNull: true },
      createdByUserId: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'blocked_ips',
      timestamps: true,
      updatedAt: false,
      indexes: [{ unique: true, fields: ['ip'] }],
    }
  );

  return BlockedIp;
};
