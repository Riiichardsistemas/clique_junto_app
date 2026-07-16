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

/**
 * Marca d'agua discreta (plano gratuito). Texto no canto inferior direito.
 * Retorna null se sharp indisponivel ou em caso de erro (segue sem marca).
 */
async function applyWatermark(buffer, text = 'feito com Clique Junto') {
  if (!sharp) return null;
  try {
    const img = sharp(buffer).rotate();
    const meta = await img.metadata();
    const w = meta.width || 1200;
    const fontSize = Math.max(16, Math.round(w * 0.02));
    const pad = Math.round(fontSize * 0.9);
    const svg = `<svg width="${w}" height="${fontSize + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <text x="${w - pad}" y="${fontSize + pad}" text-anchor="end"
        font-family="Georgia, 'Times New Roman', serif" font-style="italic"
        font-size="${fontSize}" fill="#ffffff" fill-opacity="0.5"
        stroke="#000000" stroke-opacity="0.15" stroke-width="0.5">${text}</text>
    </svg>`;
    return await img
      .composite([{ input: Buffer.from(svg), gravity: 'southeast' }])
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (e) {
    return null;
  }
}

module.exports = { makeThumbnail, getDimensions, applyWatermark, hasSharp: !!sharp };
