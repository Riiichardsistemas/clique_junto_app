const crypto = require('crypto');
const { Op } = require('sequelize');
const { Event, Guest, Photo } = require('../models');
const { EVENT_STATUS, EVENT_TYPES, FILTERS } = require('../config/constants');
const { getPlan } = require('../config/plans');
const { generateUniqueSlug } = require('../utils/generateSlug');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');

// Serializa o evento adicionando estado calculado
function serialize(event, extra = {}) {
  const json = event.toJSON();
  return {
    ...json,
    isAcceptingPhotos: event.isAcceptingPhotos(),
    isRevealed: event.isRevealed(),
    ...extra,
  };
}

// GET /api/events  — lista eventos do organizador
async function list(req, res, next) {
  try {
    const events = await Event.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    // Conta convidados e fotos de cada evento
    const result = await Promise.all(
      events.map(async (ev) => {
        const [guestCount, photoCount] = await Promise.all([
          Guest.count({ where: { eventId: ev.id } }),
          Photo.count({ where: { eventId: ev.id } }),
        ]);
        return serialize(ev, { guestCount, photoCount });
      })
    );
    res.json({ events: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/events — cria evento
async function create(req, res, next) {
  try {
    const {
      name, type, startsAt, endsAt, revealAt,
      photoLimitPerGuest, defaultFilter, isPrivate, planId,
      themeColor, welcomeMessage, entryTemplate, venueName,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'O nome do evento e obrigatorio.' });
    if (type && !EVENT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de evento invalido.' });
    }
    if (defaultFilter && !FILTERS.includes(defaultFilter)) {
      return res.status(400).json({ error: 'Filtro invalido.' });
    }

    const plan = getPlan(planId || 'free');
    if (!plan) return res.status(400).json({ error: 'Plano invalido.' });

    const slug = await generateUniqueSlug(name, async (s) => !!(await Event.findOne({ where: { slug: s } })));
    const slideshowKey = crypto.randomBytes(9).toString('hex');

    // Plano gratuito ja entra ativo; pago entra como rascunho ate o pagamento
    const isFree = plan.priceCents === 0;

    const event = await Event.create({
      userId: req.user.id,
      name: String(name).trim(),
      slug,
      type: type || 'outro',
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      revealAt: revealAt || endsAt || null,
      photoLimitPerGuest: photoLimitPerGuest != null ? Number(photoLimitPerGuest) : 10,
      defaultFilter: defaultFilter || 'nenhum',
      isPrivate: !!isPrivate,
      planId: plan.id,
      maxGuests: plan.maxGuests,
      maxPhotos: plan.capacity != null ? plan.capacity : 0,
      slideshowKey,
      themeColor: themeColor && /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : null,
      welcomeMessage: welcomeMessage ? String(welcomeMessage).slice(0, 280) : null,
      entryTemplate: ['classic', 'convite'].includes(entryTemplate) ? entryTemplate : 'classic',
      venueName: venueName ? String(venueName).slice(0, 60) : null,
      isPaid: isFree,
      pricePaidCents: isFree ? 0 : 0,
      status: isFree ? EVENT_STATUS.ACTIVE : EVENT_STATUS.DRAFT,
    });

    res.status(201).json({ event: serialize(event), requiresPayment: !isFree });
  } catch (err) {
    next(err);
  }
}

// Carrega evento garantindo posse pelo organizador
async function loadOwned(req, res) {
  const event = await Event.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!event) {
    res.status(404).json({ error: 'Evento nao encontrado.' });
    return null;
  }
  return event;
}

// GET /api/events/:id — detalhe (organizador)
async function getOne(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    if (!event.slideshowKey) {
      event.slideshowKey = crypto.randomBytes(9).toString('hex');
      await event.save();
    }
    const [guestCount, photoCount] = await Promise.all([
      Guest.count({ where: { eventId: event.id } }),
      Photo.count({ where: { eventId: event.id } }),
    ]);
    res.json({ event: serialize(event, { guestCount, photoCount }) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/events/:id — edita configuracoes
async function update(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;

    const fields = ['name', 'type', 'startsAt', 'endsAt', 'revealAt', 'photoLimitPerGuest', 'defaultFilter', 'isPrivate',
      'liveWallEnabled', 'themeColor', 'welcomeMessage', 'coverImageUrl', 'logoUrl',
      'entryTemplate', 'venueName'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) event[f] = req.body[f];
    });
    if (event.type && !EVENT_TYPES.includes(event.type)) {
      return res.status(400).json({ error: 'Tipo de evento invalido.' });
    }
    if (!['classic', 'convite'].includes(event.entryTemplate)) event.entryTemplate = 'classic';
    await event.save();
    res.json({ event: serialize(event) });
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:id/close — encerra (para de aceitar fotos)
async function close(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    if (event.status === EVENT_STATUS.REVEALED) {
      return res.status(400).json({ error: 'Evento ja revelado.' });
    }
    event.status = EVENT_STATUS.CLOSED;
    event.endsAt = new Date();
    await event.save();
    res.json({ event: serialize(event) });
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:id/reveal — revela agora (antecipa)
async function reveal(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    await Photo.update({ isVisible: true }, { where: { eventId: event.id } });
    event.status = EVENT_STATUS.REVEALED;
    event.revealAt = new Date();
    await event.save();
    const [guestCount, photoCount] = await Promise.all([
      Guest.count({ where: { eventId: event.id } }),
      Photo.count({ where: { eventId: event.id } }),
    ]);
    res.json({ event: serialize(event, { guestCount, photoCount }), message: 'Album revelado!' });

    // Notifica convidados com email em background
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
    const albumUrl = `${base}/e/${event.slug}/album`;
    Guest.findAll({ where: { eventId: event.id, email: { [Op.not]: null } } })
      .then((guests) => {
        guests.forEach((g) => {
          sendMail({ to: g.email, ...templates.guestAlbumReady(g.nickname || 'convidado', event.name, albumUrl) })
            .catch(() => {});
        });
      })
      .catch(() => {});
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:id/publish — ativa (apos pagamento). Idempotente.
// So ativa se o evento estiver pago (isPaid). Planos gratuitos ja nascem pagos.
// Planos pagos nao confirmados NAO podem ser ativados por aqui (anti-bypass).
async function publish(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    if (event.status === EVENT_STATUS.DRAFT) {
      if (!event.isPaid) {
        return res.status(402).json({
          error: 'Pagamento pendente. Conclua o pagamento para ativar este evento.',
          requiresPayment: true,
        });
      }
      event.status = EVENT_STATUS.ACTIVE;
      await event.save();
    }
    res.json({ event: serialize(event) });
  } catch (err) {
    next(err);
  }
}

// GET /api/events/:id/guests — lista convidados (organizador)
async function listGuests(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    const guests = await Guest.findAll({
      where: { eventId: event.id },
      order: [['photoCount', 'DESC']],
    });
    res.json({ guests });
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:id/guests/:guestId/ban — banir/desbanir
async function banGuest(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    const guest = await Guest.findOne({ where: { id: req.params.guestId, eventId: event.id } });
    if (!guest) return res.status(404).json({ error: 'Convidado nao encontrado.' });
    guest.isBanned = req.body.banned !== undefined ? !!req.body.banned : !guest.isBanned;
    await guest.save();
    res.json({ guest });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/events/:id — remove evento, convidados e arquivos de fotos
async function destroy(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;

    // Remove arquivos do storage antes de deletar os registros
    const photos = await Photo.findAll({ where: { eventId: event.id } });
    const storage = require('../config/storage');
    await Promise.all(
      photos.flatMap((p) => [
        storage.remove(p.storageKey).catch(() => {}),
        p.thumbKey ? storage.remove(p.thumbKey).catch(() => {}) : null,
      ].filter(Boolean))
    );

    // Cascade: fotos e convidados
    await Photo.destroy({ where: { eventId: event.id } });
    await Guest.destroy({ where: { eventId: event.id } });
    await event.destroy();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:id/branding-image?slot=cover|logo  (organizador)
// Recebe imagem (multipart campo "image") e salva no storage; grava a URL no evento.
async function uploadBrandingImage(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;

    const file = req.file;
    if (!file || !file.buffer || !file.buffer.length) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    const VALID_SLOTS = ['cover', 'logo', 'invite1', 'invite2', 'invite3'];
    const slot = VALID_SLOTS.includes(req.query.slot) ? req.query.slot : 'cover';
    const storage = require('../config/storage');
    const { url } = await storage.saveObject({
      eventId: event.id,
      fileName: `${slot}-${file.originalname || 'img.jpg'}`,
      buffer: file.buffer,
      contentType: file.mimetype || 'image/jpeg',
      appUrl: process.env.APP_URL,
    });

    const SLOT_FIELD = {
      cover: 'coverImageUrl', logo: 'logoUrl',
      invite1: 'invitePhoto1Url', invite2: 'invitePhoto2Url', invite3: 'invitePhoto3Url',
    };
    event[SLOT_FIELD[slot]] = url;
    await event.save();

    res.json({ ok: true, slot, url, event: serialize(event) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list, create, getOne, update, close, reveal, publish, destroy, listGuests, banGuest,
  uploadBrandingImage, loadOwned, serialize,
};
