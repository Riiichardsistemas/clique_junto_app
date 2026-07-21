const { AdminAuditLog } = require('../models');

async function recordAdminAction(req, entry) {
  try {
    await AdminAuditLog.create({
      adminUserId: req.user?.id || null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ? String(entry.targetId) : null,
      targetLabel: entry.targetLabel ? String(entry.targetLabel).slice(0, 180) : null,
      metadata: entry.metadata || {},
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: String(req.get('user-agent') || '').slice(0, 255) || null,
    });
  } catch (error) {
    // A acao principal nao deve falhar depois de concluida por indisponibilidade do log.
    console.error('[AUDIT] Nao foi possivel registrar acao administrativa:', error.message);
  }
}

module.exports = { recordAdminAction };
