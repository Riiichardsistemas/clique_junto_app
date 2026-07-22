const path = require('path');
const { Op } = require('sequelize');
const { Event, Guest, Photo } = require('../models');
const {
  EVENT_STATUS, FILTERS,
  ALLOWED_MIME, ALLOWED_VIDEO_MIME, MAX_VIDEO_SECONDS,
} = require('../config/constants');
const storage = require('../config/storage');
const { makeThumbnail, getDimensions, applyWatermark } = require('../utils/thumbnail');
const { streamZip } = require('../utils/generateZip');

// Chave segura: relativa a events/, sem escapar do diretorio de uploads
function isSafeKey(key) {
  if (typeof key !== 'string' || !key.startsWith('events/')) return false;
  const normalized = path.posix.normalize(key);
  return normalized === key && !normalized.includes('..') && !path.isAbsolute(normalized);
}

// POST /api/photos/upload-url  (convidado) — gera URL de upload
async function getUploadUrl(req, res, next) {
  try {
    const event = req.event;
    const guest = req.guest;

    if (!event.isAcceptingPhotos()) {
      return res.status(403).json({ error: 'Este evento nao esta aceitando fotos no momento.' });
    }
    // Limite por convidado
    if (event.photoLimitPerGuest > 0 && guest.photoCount >= event.photoLimitPerGuest) {
      return res.status(403).json({ error: 'Voce ja usou todas as suas fotos.' });
    }
    // Capacidade total do album (conforme o plano). 0 = ilimitado.
    if (event.maxPhotos > 0) {
      const eventPhotoCount = await Photo.count({ where: { eventId: event.id } });
      if (eventPhotoCount >= event.maxPhotos) {
        return res.status(403).json({ error: 'Este álbum atingiu a capacidade máxima de memórias do plano.' });
      }
    }

    const { fileName, fileType, mediaType } = req.body;
    const isVideo = mediaType === 'video';

    // Valida o tipo de arquivo conforme a midia
    const allowed = isVideo ? ALLOWED_VIDEO_MIME : ALLOWED_MIME;
    const type = fileType || (isVideo ? 'video/webm' : 'image/jpeg');
    if (!allowed.includes(type)) {
      return res.status(400).json({ error: 'Tipo de arquivo nao permitido.' });
    }

    const { uploadUrl, method, key } = await storage.getUploadUrl({
      eventId: event.id,
      fileName: fileName || (isVideo ? 'video.webm' : 'foto.jpg'),
      fileType: type,
      appUrl: process.env.APP_URL,
    });

    res.json({ uploadUrl, method, key, storageMode: storage.useS3 ? 's3' : 'local' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/photos/storage/:key  — recebe bytes no modo local (sem auth pesada;
// a key e gerada aleatoriamente e so e conhecida por quem pediu upload-url)
async function localStorageUpload(req, res, next) {
  try {
    if (storage.useS3) return res.status(400).json({ error: 'Storage local desabilitado.' });
    const key = decodeURIComponent(req.params.key);
    // Protecao contra path traversal (ex.: events/../../etc)
    if (!isSafeKey(key)) return res.status(400).json({ error: 'Chave invalida.' });
    const buffer = req.rawBuffer;
    if (!buffer || !buffer.length) return res.status(400).json({ error: 'Arquivo vazio.' });
    await storage.saveLocal(key, buffer);
    res.json({ ok: true, key });
  } catch (err) {
    next(err);
  }
}

// POST /api/photos  (convidado) — salva metadados apos upload
async function create(req, res, next) {
  try {
    const event = req.event;
    const guest = req.guest;

    if (!event.isAcceptingPhotos()) {
      return res.status(403).json({ error: 'Este evento nao esta aceitando fotos.' });
    }
    if (event.photoLimitPerGuest > 0 && guest.photoCount >= event.photoLimitPerGuest) {
      return res.status(403).json({ error: 'Voce ja usou todas as suas fotos.' });
    }
    // Capacidade total do album (conforme o plano). 0 = ilimitado.
    if (event.maxPhotos > 0) {
      const eventPhotoCount = await Photo.count({ where: { eventId: event.id } });
      if (eventPhotoCount >= event.maxPhotos) {
        return res.status(403).json({ error: 'Este álbum atingiu a capacidade máxima de memórias do plano.' });
      }
    }

    const { storageKey, filter, mediaType, durationSeconds } = req.body;
    if (!storageKey || !isSafeKey(storageKey)) {
      return res.status(400).json({ error: 'storageKey ausente ou invalida.' });
    }
    const isVideo = mediaType === 'video';
    const usedFilter = FILTERS.includes(filter) ? filter : event.defaultFilter;

    // Valida duracao do video
    let duration = null;
    if (isVideo) {
      duration = Number(durationSeconds) || null;
      if (duration && duration > MAX_VIDEO_SECONDS + 1) {
        return res.status(400).json({ error: `Videos podem ter no maximo ${MAX_VIDEO_SECONDS} segundos.` });
      }
    }

    // Pos-processamento de fotos (modo local + sharp disponivel)
    let thumbKey = null;
    let dims = {};
    if (!isVideo && !storage.useS3) {
      try {
        const fs = require('fs');
        const fullPath = storage.localPath(storageKey);
        if (fs.existsSync(fullPath)) {
          let buf = await fs.promises.readFile(fullPath);

          // Marca d'agua no plano gratuito (CTA de crescimento)
          if (event.planId === 'free') {
            const marked = await applyWatermark(buf);
            if (marked) {
              await storage.saveLocal(storageKey, marked);
              buf = marked;
            }
          }

          dims = await getDimensions(buf);
          const thumb = await makeThumbnail(buf);
          if (thumb) {
            thumbKey = storageKey.replace(/(\.[a-z]+)$/i, '_thumb.jpg');
            await storage.saveLocal(thumbKey, thumb);
          }
        }
      } catch (e) { /* segue sem thumb */ }
    }

    const photo = await Photo.create({
      eventId: event.id,
      guestId: guest.id,
      storageKey,
      thumbKey,
      mediaType: isVideo ? 'video' : 'photo',
      durationSeconds: duration,
      filter: usedFilter,
      width: dims.width || null,
      height: dims.height || null,
      isVisible: event.isRevealed(), // se ja revelado, ja entra visivel
    });

    guest.photoCount += 1;
    await guest.save();

    const remaining = event.photoLimitPerGuest === 0
      ? null
      : Math.max(0, event.photoLimitPerGuest - guest.photoCount);

    res.status(201).json({ photo: { id: photo.id }, photosRemaining: remaining });
  } catch (err) {
    next(err);
  }
}

// Monta a URL de leitura de uma foto
async function withUrls(photo) {
  const url = await storage.getReadUrl(photo.storageKey, { appUrl: process.env.APP_URL });
  const thumbUrl = photo.thumbKey
    ? await storage.getReadUrl(photo.thumbKey, { appUrl: process.env.APP_URL })
    : url;
  return {
    id: photo.id,
    filter: photo.filter,
    mediaType: photo.mediaType || 'photo',
    durationSeconds: photo.durationSeconds,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt,
    guestId: photo.guestId,
    url,
    thumbUrl,
  };
}

// GET /api/photos/event/:eventId  — lista fotos (publico, respeita revelacao)
async function listForEvent(req, res, next) {
  try {
    const event = await Event.findByPk(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const revealed = event.isRevealed();
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Number(req.query.offset) || 0;

    if (!revealed) {
      // Antes da revelacao: nao retorna conteudo, apenas contagem
      const total = await Photo.count({ where: { eventId: event.id } });
      return res.json({ revealed: false, total, photos: [], revealAt: event.revealAt });
    }

    const { rows, count } = await Photo.findAndCountAll({
      where: { eventId: event.id, isVisible: true },
      include: [{ model: Guest, as: 'guest', attributes: ['id', 'nickname'] }],
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });

    const photos = await Promise.all(
      rows.map(async (p) => {
        const base = await withUrls(p);
        return { ...base, guestNickname: p.guest ? p.guest.nickname : null };
      })
    );

    res.json({
      revealed: true,
      total: count,
      photos,
      hasMore: offset + rows.length < count,
      // Plano gratuito exibe CTA "Crie o seu evento" no album
      showBranding: event.planId === 'free',
      eventName: event.name,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/photos/event/:eventId/admin  (organizador) — lista TODAS as fotos sem restrição de revelação
async function listForEventAdmin(req, res, next) {
  try {
    const event = await Event.findOne({ where: { id: req.params.eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento não encontrado.' });

    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const offset = Number(req.query.offset) || 0;

    const { rows, count } = await Photo.findAndCountAll({
      where: { eventId: event.id },
      include: [{ model: Guest, as: 'guest', attributes: ['id', 'nickname'] }],
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });

    const photos = await Promise.all(
      rows.map(async (p) => {
        const base = await withUrls(p);
        return { ...base, guestNickname: p.guest ? p.guest.nickname : null };
      })
    );

    res.json({ total: count, photos, hasMore: offset + rows.length < count });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/photos/:id  (organizador) — moderacao
async function remove(req, res, next) {
  try {
    const photo = await Photo.findByPk(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Foto nao encontrada.' });
    const event = await Event.findOne({ where: { id: photo.eventId, userId: req.user.id } });
    if (!event) return res.status(403).json({ error: 'Sem permissao.' });

    await storage.remove(photo.storageKey).catch(() => {});
    if (photo.thumbKey) await storage.remove(photo.thumbKey).catch(() => {});

    const guest = await Guest.findByPk(photo.guestId);
    if (guest && guest.photoCount > 0) { guest.photoCount -= 1; await guest.save(); }

    await photo.destroy();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/photos/event/:eventId/download  (organizador) — ZIP de todas as fotos
async function downloadZip(req, res, next) {
  try {
    const event = await Event.findOne({ where: { id: req.params.eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });
    if (storage.useS3) {
      return res.status(400).json({ error: 'Download em ZIP disponivel apenas no modo local nesta versao.' });
    }
    const photos = await Photo.findAll({ where: { eventId: event.id }, order: [['createdAt', 'ASC']] });
    if (!photos.length) return res.status(404).json({ error: 'Nenhuma foto para baixar.' });

    const fs = require('fs');
    const files = photos
      .map((p, i) => {
        const ext = (path.extname(p.storageKey) || '.jpg').toLowerCase();
        return { path: storage.localPath(p.storageKey), name: `${String(i + 1).padStart(3, '0')}${ext}` };
      })
      .filter((f) => fs.existsSync(f.path));

    await streamZip(res, files, `album-${event.slug}.zip`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUploadUrl, localStorageUpload, create, listForEvent, listForEventAdmin, remove, downloadZip, withUrls,
};
