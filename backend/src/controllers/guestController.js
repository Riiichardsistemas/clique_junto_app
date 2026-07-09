const { Event, Guest, Photo } = require('../models');
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
    const { slug, nickname } = req.body;
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

    const guest = await Guest.create({
      eventId: event.id,
      nickname: nickname ? String(nickname).trim().slice(0, 40) : null,
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

module.exports = { getEventBySlug, join, me, publicEvent };
