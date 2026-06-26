const rateLimit = require('express-rate-limit');

// Limite generico para a API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Tente novamente em instantes.' },
});

// Limite mais estrito para upload (por IP)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos envios em pouco tempo. Aguarde um momento.' },
});

module.exports = { apiLimiter, uploadLimiter };
