const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verifica o JWT do organizador.
 * Espera o header: Authorization: Bearer <token>
 * Em caso de sucesso, anexa o usuario em req.user.
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token de autenticacao ausente.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      return res.status(401).json({ error: 'Token invalido ou expirado.' });
    }

    if (payload.type !== 'organizer') {
      return res.status(401).json({ error: 'Token invalido.' });
    }

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Usuario nao encontrado.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Esta conta esta desativada.' });
    }
    // Revogacao: um token emitido antes da ultima troca/reset de senha e invalido.
    if ((payload.v || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Sessao expirada. Faca login novamente.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
