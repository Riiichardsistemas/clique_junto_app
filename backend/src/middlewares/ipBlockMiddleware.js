const { BlockedIp } = require('../models');

/**
 * Bloqueio de IP.
 *
 * Mantém um cache em memória (Set) dos IPs bloqueados para não consultar o
 * banco a cada requisição. O cache é carregado no boot e recarregado sempre
 * que o admin bloqueia/desbloqueia um IP.
 */
let blockedSet = new Set();

async function refreshBlockedIps() {
  try {
    const rows = await BlockedIp.findAll({ attributes: ['ip'] });
    blockedSet = new Set(rows.map((row) => String(row.ip).trim()));
  } catch (error) {
    console.error('[IP-BLOCK] Não foi possível carregar IPs bloqueados:', error.message);
  }
  return blockedSet;
}

function isBlocked(ip) {
  return blockedSet.has(String(ip || '').trim());
}

function getBlockedSet() {
  return blockedSet;
}

function ipBlockMiddleware(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  if (isBlocked(ip)) {
    return res.status(403).json({ error: 'Acesso bloqueado.' });
  }
  return next();
}

module.exports = { ipBlockMiddleware, refreshBlockedIps, isBlocked, getBlockedSet };
