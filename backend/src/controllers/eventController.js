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

    const fields = ['name', 'type', 'startsAt', 'endsAt', 'revealAt', 'photoLimitPerGuest', 'defaultFilter', 'isPrivate'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) event[f] = req.body[f];
    });
    if (event.type && !EVENT_TYPES.includes(event.type)) {
      return res.status(400).json({ error: 'Tipo de evento invalido.' });
    }
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
async function publish(req, res, next) {
  try {
    const event = await loadOwned(req, res);
    if (!event) return;
    if (event.status === EVENT_STATUS.DRAFT) {
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

module.exports = {
  list, create, getOne, update, close, reveal, publish, destroy, listGuests, banGuest, loadOwned, serialize,
};
