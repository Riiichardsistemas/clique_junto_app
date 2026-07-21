const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminAuditLog = sequelize.define(
    'AdminAuditLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      adminUserId: { type: DataTypes.UUID, allowNull: true },
      action: { type: DataTypes.STRING(80), allowNull: false },
      targetType: { type: DataTypes.STRING(40), allowNull: false },
      targetId: { type: DataTypes.STRING(100), allowNull: true },
      targetLabel: { type: DataTypes.STRING(180), allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'admin_audit_logs',
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ['adminUserId'] },
        { fields: ['action'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return AdminAuditLog;
};
