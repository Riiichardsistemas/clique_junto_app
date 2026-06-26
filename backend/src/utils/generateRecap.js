/**
 * Geracao de video recap (slideshow) com FFmpeg.
 *
 * FFmpeg e opcional. Se fluent-ffmpeg / binario do ffmpeg nao estiverem
 * disponiveis, a funcao retorna { ok:false, reason } e o sistema marca o
 * recap como indisponivel (sem quebrar). Em producao, instale o ffmpeg no
 * servidor (ou use a Shotstack API).
 */
const path = require('path');
const fs = require('fs');

let ffmpeg = null;
try {
  // eslint-disable-next-line global-require
  ffmpeg = require('fluent-ffmpeg');
} catch (e) {
  ffmpeg = null;
}

/**
 * @param {Object} opts
 * @param {string[]} opts.imagePaths  caminhos locais das fotos (ja reveladas)
 * @param {string} opts.outputPath    caminho de saida .mp4
 * @param {number} opts.perPhotoSec   segundos por foto (default 1.5)
 */
async function generateRecapVideo({ imagePaths, outputPath, perPhotoSec = 1.5 }) {
  if (!ffmpeg) return { ok: false, reason: 'ffmpeg_indisponivel' };
  if (!imagePaths || imagePaths.length === 0) return { ok: false, reason: 'sem_fotos' };

  // Limita a 30 fotos
  const imgs = imagePaths.slice(0, 30);

  return new Promise((resolve) => {
    try {
      const command = ffmpeg();
      imgs.forEach((p) => command.input(p).inputOptions([`-loop 1`, `-t ${perPhotoSec}`]));

      command
        .on('end', () => resolve({ ok: true, outputPath }))
        .on('error', (err) => resolve({ ok: false, reason: err.message }))
        .videoCodec('libx264')
        .outputOptions(['-pix_fmt yuv420p', '-r 30'])
        .size('1280x720')
        .save(outputPath);
    } catch (e) {
      resolve({ ok: false, reason: e.message });
    }
  });
}

module.exports = { generateRecapVideo, hasFfmpeg: !!ffmpeg };
