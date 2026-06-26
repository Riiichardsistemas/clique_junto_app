/**
 * Geracao de thumbnail com sharp (opcional).
 * sharp e uma dependencia nativa; se nao estiver instalada, a funcao
 * simplesmente retorna null e o sistema segue sem thumbnail.
 */
let sharp = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

async function makeThumbnail(buffer) {
  if (!sharp) return null;
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    return out;
  } catch (e) {
    return null;
  }
}

async function getDimensions(buffer) {
  if (!sharp) return {};
  try {
    const meta = await sharp(buffer).metadata();
    return { width: meta.width, height: meta.height };
  } catch (e) {
    return {};
  }
}

module.exports = { makeThumbnail, getDimensions, hasSharp: !!sharp };
