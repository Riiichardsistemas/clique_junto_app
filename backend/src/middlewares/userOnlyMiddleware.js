/**
 * Mantem as operacoes de organizador separadas do super-admin.
 * Deve ser usado depois do authMiddleware.
 */
function userOnlyMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ error: 'Esta funcionalidade e exclusiva para organizadores.' });
  }
  next();
}

module.exports = userOnlyMiddleware;
