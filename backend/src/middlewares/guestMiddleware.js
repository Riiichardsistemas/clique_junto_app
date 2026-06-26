const { Guest, Event } = require('../models');
const { verifyGuestToken } = require('../utils/generateToken');

/**
 * Verifica o token anonimo do convidado.
 * Aceita via header Authorization: Bearer <token> ou body.guestToken.
 * Anexa req.guest e req.event.
 */
async function guestMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.body.guestToken || req.query.guestToken;

    if (!token) return res.status(401).json({ error: 'Sessao de convidado ausente.' });

    let payload;
    try {
      payload = verifyGuestToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Sessao de convidado invalida ou expirada.' });
    }
    if (payload.type !== 'guest') return res.status(401).json({ error: 'Token invalido.' });

    const guest = await Guest.findByPk(payload.sub);
    if (!guest) return res.status(401).json({ error: 'Convidado nao encontrado.' });
    if (guest.isBanned) return res.status(403).json({ error: 'Acesso removido pelo organizador.' });

    const event = await Event.findByPk(guest.eventId);
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    req.guest = guest;
    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = guestMiddleware;
