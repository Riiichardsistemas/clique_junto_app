const { DataTypes } = require('sequelize');

/**
 * Registro de acessos (logins, tentativas falhas e logouts).
 * Alimenta a página de "Logs de acesso" do super admin e permite
 * bloquear IPs suspeitos a partir dos registros.
 */
module.exports = (sequelize) => {
  const AccessLog = sequelize.define(
    'AccessLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: true },
      email: { type: DataTypes.STRING(180), allowNull: true },
      // login_success | login_failed | logout | password_reset
      type: { type: DataTypes.STRING(40), allowNull: false },
      reason: { type: DataTypes.STRING(120), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'access_logs',
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ['userId'] },
        { fields: ['type'] },
        { fields: ['ip'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return AccessLog;
};
