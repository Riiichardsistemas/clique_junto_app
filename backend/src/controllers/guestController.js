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
    entryTemplate: event.entryTemplate || 'classic',
    venueName: event.venueName || null,
    invitePhotos: [event.invitePhoto1Url, event.invitePhoto2Url, event.invitePhoto3Url].filter(Boolean),
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

    // Email é obrigatório: identifica o convidado se ele voltar por outro
    // navegador/aparelho, preservando o contador de fotos (sem "vaga" nova).
    const trimmed = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Informe um email válido para entrar.' });
    }
    const guestEmail = trimmed;

    // Convidado retornando — recupera a sessão existente em vez de criar outra
    const existing = await Guest.findOne({ where: { eventId: event.id, email: guestEmail } });
    if (existing) {
      if (existing.isBanned) {
        return res.status(403).json({ error: 'Acesso removido pelo organizador.' });
      }
      if (nickname) {
        existing.nickname = String(nickname).trim().slice(0, 40);
        await existing.save();
      }
      const token = generateGuestToken(existing);
      return res.json({ guest: existing, token, event: publicEvent(event), returning: true });
    }

    // Limite de participantes do plano (só para convidados novos)
    const guestCount = await Guest.count({ where: { eventId: event.id } });
    if (guestCount >= event.maxGuests) {
      return res.status(403).json({ error: 'Este evento atingiu o limite de participantes.' });
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
// O telão não depende da revelação: o link é secreto e só o organizador o tem —
// abrir/compartilhar o telão já é a decisão de exibir as fotos ao vivo.
async function slideshow(req, res, next) {
  try {
    const event = await Event.findOne({ where: { slideshowKey: req.params.key } });
    if (!event) return res.status(404).json({ error: 'Telao nao encontrado.' });

    const brand = {
      id: event.id,
      name: event.name,
      type: event.type,
      logoUrl: event.logoUrl || null,
      coverImageUrl: event.coverImageUrl || null,
      themeColor: event.themeColor || null,
      showBranding: event.planId === 'free',
    };

    // Sempre ao vivo: todas as fotos do evento, na ordem de chegada
    const where = { eventId: event.id };
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
    res.json({ mode: 'live', event: brand, photos, total });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEventBySlug, join, me, publicEvent, slideshow };
