/**
 * Exige que o usuário autenticado seja super-admin (role === 'admin').
 * Deve ser usado SEMPRE depois do authMiddleware.
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}

module.exports = adminMiddleware;
