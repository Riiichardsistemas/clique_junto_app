const { AccessLog } = require('../models');

/**
 * Registra um evento de acesso (login, falha, logout).
 * Nunca deve interromper o fluxo principal — falhas são apenas logadas.
 */
async function recordAccess(req, entry) {
  try {
    await AccessLog.create({
      userId: entry.userId || null,
      email: entry.email ? String(entry.email).slice(0, 180) : null,
      type: entry.type,
      reason: entry.reason ? String(entry.reason).slice(0, 120) : null,
      ip: req?.ip || req?.socket?.remoteAddress || null,
      userAgent: String(req?.get?.('user-agent') || '').slice(0, 255) || null,
    });
  } catch (error) {
    console.error('[ACCESS] Não foi possível registrar acesso:', error.message);
  }
}

module.exports = { recordAccess };
