const crypto = require('crypto');

// Alfabeto sem caracteres ambiguos (0/O, 1/I/L) para facilitar digitacao/leitura.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Gera um codigo de indicacao unico.
 * Recebe `exists(code)` que retorna true se o codigo ja esta em uso.
 */
async function generateUniqueReferralCode(exists, length = 8) {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode(length);
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(code))) return code;
  }
  // fallback praticamente impossivel de colidir
  return randomCode(12);
}

module.exports = { generateUniqueReferralCode, randomCode };
