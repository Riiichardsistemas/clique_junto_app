const { Op } = require('sequelize');
const { Event, Guest, Photo } = require('../models');
const storage = require('../config/storage');
const { EVENT_STATUS } = require('../config/constants');
const { generateGuestToken } = require('../utils/generateToken');

// Info publica do evento (sem dados sensiveis)
function publicEvent(event) {
  return {
    id: event.id,
    name: event.name,
    type: event.type,
    slug: event.slug,
    status: event.status,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    revealAt: event.revealAt,
    defaultFilter: event.defaultFilter,
    photoLimitPerGuest: event.photoLimitPerGuest,
    isAcceptingPhotos: event.isAcceptingPhotos(),
    isRevealed: event.isRevealed(),
    recapVideoUrl: event.isRevealed() ? event.recapVideoUrl : null,
    showBranding: event.planId === 'free',
    // Personalização (identidade visual do evento)
    coverImageUrl: event.coverImageUrl || null,
    logoUrl: event.logoUrl || null,
    themeColor: event.themeColor || null,
    welcomeMessage: event.welcomeMessage || null,
  };
}

// GET /api/guests/event/:slug — pagina de entrada do convidado
async function getEventBySlug(req, res, next) {
  try {
    const event = await Event.findOne({ where: { slug: req.params.slug } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const photoCount = await Photo.count({ where: { eventId: event.id } });
    const guestCount = await Guest.count({ where: { eventId: event.id } });

    res.json({ event: publicEvent(event), stats: { photoCount, guestCount } });
  } catch (err) {
    next(err);
  }
}

// POST /api/guests/join — convidado entra, recebe token anonimo
async function join(req, res, next) {
  try {
    const { slug, nickname, email } = req.body;
    if (!slug) return res.status(400).json({ error: 'Evento nao informado.' });

    const event = await Event.findOne({ where: { slug } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    if (event.status === EVENT_STATUS.DRAFT) {
      return res.status(403).json({ error: 'Este evento ainda nao foi ativado.' });
    }

    // Limite de participantes do plano
    const guestCount = await Guest.count({ where: { eventId: event.id } });
    if (guestCount >= event.maxGuests) {
      return res.status(403).json({ error: 'Este evento atingiu o limite de participantes.' });
    }

    // Valida email se fornecido
    let guestEmail = null;
    if (email) {
      const trimmed = String(email).trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) guestEmail = trimmed;
    }

    const guest = await Guest.create({
      eventId: event.id,
      nickname: nickname ? String(nickname).trim().slice(0, 40) : null,
      email: guestEmail,
      userAgent: (req.headers['user-agent'] || '').slice(0, 250),
    });

    const token = generateGuestToken(guest);
    res.status(201).json({ guest, token, event: publicEvent(event) });
  } catch (err) {
    next(err);
  }
}

// GET /api/guests/me — estado da sessao do convidado (usa guestMiddleware)
async function me(req, res) {
  const remaining = req.event.photoLimitPerGuest === 0
    ? null
    : Math.max(0, req.event.photoLimitPerGuest - req.guest.photoCount);
  res.json({
    guest: req.guest,
    event: publicEvent(req.event),
    photosRemaining: remaining,
  });
}

// GET /api/guests/slideshow/:key — dados do telão (link secreto, sem login)
// Se liveWallEnabled: mostra fotos ao vivo. Senão, só depois da revelação.
async function slideshow(req, res, next) {
  try {
    const event = await Event.findOne({ where: { slideshowKey: req.params.key } });
    if (!event) return res.status(404).json({ error: 'Telao nao encontrado.' });

    const live = !!event.liveWallEnabled;
    const revealed = event.isRevealed();

    const brand = {
      id: event.id,
      name: event.name,
      type: event.type,
      logoUrl: event.logoUrl || null,
      coverImageUrl: event.coverImageUrl || null,
      themeColor: event.themeColor || null,
      showBranding: event.planId === 'free',
    };

    // Sem modo ao vivo e ainda não revelado → tela de espera
    if (!live && !revealed) {
      return res.json({ mode: 'waiting', event: brand, photos: [], revealAt: event.revealAt });
    }

    // Ao vivo mostra tudo; senão apenas as visíveis (reveladas)
    const where = live ? { eventId: event.id } : { eventId: event.id, isVisible: true };
    const limit = Math.min(Number(req.query.limit) || 80, 150);

    const rows = await Photo.findAll({
      where,
      include: [{ model: Guest, as: 'guest', attributes: ['id', 'nickname'] }],
      order: [['createdAt', 'DESC']],
      limit,
    });

    const photos = await Promise.all(rows.map(async (p) => ({
      id: p.id,
      url: await storage.getReadUrl(p.storageKey, { appUrl: process.env.APP_URL }),
      mediaType: p.mediaType || 'photo',
      filter: p.filter,
      guestNickname: p.guest ? p.guest.nickname : null,
      createdAt: p.createdAt,
    })));

    const total = await Photo.count({ where });
    res.json({ mode: live ? 'live' : 'revealed', event: brand, photos, total });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEventBySlug, join, me, publicEvent, slideshow };
