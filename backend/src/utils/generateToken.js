const jwt = require('jsonwebtoken');

/**
 * Gera um JWT para o organizador autenticado.
 */
function generateAuthToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    type: 'organizer',
    v: user.tokenVersion || 0, // versao do token (revogacao)
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  });
}

/**
 * Gera um JWT anonimo para o convidado (vinculado ao evento).
 */
function generateGuestToken(guest) {
  const payload = { sub: guest.id, eventId: guest.eventId, type: 'guest' };
  return jwt.sign(payload, process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.GUEST_JWT_EXPIRES_IN || '30d',
    algorithm: 'HS256',
  });
}

function verifyGuestToken(token) {
  return jwt.verify(token, process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

module.exports = { generateAuthToken, generateGuestToken, verifyGuestToken };
