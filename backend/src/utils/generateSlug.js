const crypto = require('crypto');

const ADJ = ['feliz', 'dourado', 'eterno', 'magico', 'belo', 'doce', 'unico', 'querido'];
const NOUN = ['momento', 'instante', 'memoria', 'festa', 'brinde', 'sorriso', 'abraco'];

function slugifyName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

/**
 * Gera um slug unico para o evento.
 * Recebe uma funcao `exists(slug)` que retorna true se ja existe.
 */
async function generateUniqueSlug(name, exists) {
  const base = slugifyName(name) || `${pick(ADJ)}-${pick(NOUN)}`;
  for (let i = 0; i < 8; i++) {
    const suffix = crypto.randomBytes(3).toString('hex'); // 6 chars
    const slug = `${base}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(slug))) return slug;
  }
  // fallback praticamente impossivel de colidir
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { generateUniqueSlug, slugifyName };
