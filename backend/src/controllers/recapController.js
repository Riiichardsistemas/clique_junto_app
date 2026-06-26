const path = require('path');
const fs = require('fs');
const { Event, Photo, User } = require('../models');
const storage = require('../config/storage');
const { generateRecapVideo, hasFfmpeg } = require('../utils/generateRecap');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');

// Seleciona ate N fotos (aleatorio)
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// POST /api/recap/generate  (organizador)
async function generate(req, res, next) {
  try {
    const { eventId } = req.body;
    const event = await Event.findOne({ where: { id: eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });
    if (!event.isRevealed()) {
      return res.status(400).json({ error: 'O recap so pode ser gerado apos a revelacao.' });
    }

    const photos = await Photo.findAll({ where: { eventId: event.id, isVisible: true } });
    if (!photos.length) return res.status(400).json({ error: 'Nenhuma foto disponivel.' });

    if (storage.useS3 || !hasFfmpeg) {
      // Sem ffmpeg (ou em S3, que exigiria baixar as fotos): marca indisponivel
      event.recapStatus = 'failed';
      await event.save();
      return res.status(501).json({
        error: 'Geracao de video indisponivel neste ambiente (ffmpeg nao instalado). '
          + 'Instale o ffmpeg no servidor ou configure a Shotstack API.',
        recapStatus: 'failed',
      });
    }

    event.recapStatus = 'processing';
    await event.save();
    res.json({ recapStatus: 'processing', message: 'Gerando seu video recap...' });

    // Processa em background (nao bloqueia a resposta)
    (async () => {
      try {
        const selected = pickRandom(photos, 30);
        const imagePaths = selected
          .map((p) => storage.localPath(p.storageKey))
          .filter((p) => fs.existsSync(p));

        const outKey = `events/${event.id}/recap.mp4`;
        const outPath = storage.localPath(outKey);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        const result = await generateRecapVideo({ imagePaths, outputPath: outPath });
        if (result.ok) {
          event.recapVideoUrl = await storage.getReadUrl(outKey, { appUrl: process.env.APP_URL });
          event.recapStatus = 'ready';
          await event.save();

          const user = await User.findByPk(event.userId);
          if (user) {
            const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
            const tpl = templates.recapReady(user.name, event.name, `${base}/events/${event.id}`);
            await sendMail({ to: user.email, ...tpl }).catch(() => {});
          }
        } else {
          event.recapStatus = 'failed';
          await event.save();
        }
      } catch (e) {
        event.recapStatus = 'failed';
        await event.save().catch(() => {});
      }
    })();
  } catch (err) {
    next(err);
  }
}

// GET /api/recap/:eventId/status
async function status(req, res, next) {
  try {
    const event = await Event.findOne({ where: { id: req.params.eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });
    res.json({ recapStatus: event.recapStatus, recapVideoUrl: event.recapVideoUrl, ffmpegDisponivel: hasFfmpeg });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, status };
