const { Op, fn, col } = require('sequelize');
const { User, Event, Guest, Photo, Plan, AdminAuditLog, AccessLog, BlockedIp, Commission, sequelize } = require('../models');
const { getPlan, formatBRL } = require('../config/plans');
const { DEFAULT_RATE_BPS, formatRate } = require('../config/affiliate');
const { EVENT_STATUS } = require('../config/constants');
const storage = require('../config/storage');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');
const { recordAdminAction } = require('../services/adminAuditService');
const { refreshBlockedIps } = require('../middlewares/ipBlockMiddleware');

function pagination(query, defaultLimit = 25) {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

function organizerSummary(organizer) {
  return organizer
    ? { id: organizer.id, name: organizer.name, email: organizer.email }
    : null;
}

async function eventUsage(eventId) {
  const [guestCount, photoCount, mediaBytes] = await Promise.all([
    Guest.count({ where: { eventId } }),
    Photo.count({ where: { eventId } }),
    Photo.sum('sizeBytes', { where: { eventId } }),
  ]);
  return { guestCount, photoCount, mediaBytes: Number(mediaBytes) || 0 };
}

async function serializeEvent(event) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    type: event.type,
    status: event.status,
    planId: event.planId,
    maxGuests: event.maxGuests,
    maxPhotos: event.maxPhotos,
    isPaid: event.isPaid,
    pricePaidCents: event.pricePaidCents,
    createdAt: event.createdAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    revealAt: event.revealAt,
    isPrivate: event.isPrivate,
    liveWallEnabled: event.liveWallEnabled,
    recapStatus: event.recapStatus,
    coverImageUrl: event.coverImageUrl,
    logoUrl: event.logoUrl,
    welcomeMessage: event.welcomeMessage,
    venueName: event.venueName,
    organizer: organizerSummary(event.organizer),
    ...(await eventUsage(event.id)),
  };
}

// GET /api/admin/overview
async function overview(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalUsers, activeUsers, adminCount, usersThisMonth,
      totalEvents, eventsThisMonth, totalGuests, totalPhotos, totalMediaBytes,
      pendingPayments, failedPayments, checkoutCount,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { role: 'admin', isActive: true } }),
      User.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
      Event.count(),
      Event.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
      Guest.count(),
      Photo.count(),
      Photo.sum('sizeBytes'),
      Plan.count({ where: { status: 'pending' } }),
      Plan.count({ where: { status: 'failed' } }),
      Plan.count(),
    ]);

    const statusRows = await Event.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const eventsByStatus = statusRows.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});

    const allPaid = await Plan.findAll({ where: { status: 'paid' }, raw: true });
    // Redencoes via credito nao sao receita de caixa — excluidas das metricas financeiras.
    const paid = allPaid.filter((payment) => payment.provider !== 'credit');
    const creditRedemptions = allPaid.filter((payment) => payment.provider === 'credit');
    const revenueCents = paid.reduce((sum, payment) => sum + (payment.amountCents || 0), 0);
    const paidThisMonth = paid.filter((payment) => new Date(payment.paidAt || payment.updatedAt) >= monthStart);
    const revenueMonthCents = paidThisMonth.reduce((sum, payment) => sum + (payment.amountCents || 0), 0);

    const buckets = {};
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      buckets[key] = { date: key, sales: 0, revenueCents: 0 };
    }
    paid.forEach((payment) => {
      const key = new Date(payment.paidAt || payment.updatedAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].sales += 1;
        buckets[key].revenueCents += payment.amountCents || 0;
      }
    });

    const planMap = {};
    paid.forEach((payment) => {
      planMap[payment.planId] ||= { planId: payment.planId, count: 0, revenueCents: 0 };
      planMap[payment.planId].count += 1;
      planMap[payment.planId].revenueCents += payment.amountCents || 0;
    });
    const planDistribution = Object.values(planMap)
      .map((item) => ({ ...item, label: getPlan(item.planId)?.label || item.planId }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

    const [recent, recentAudit] = await Promise.all([
      Plan.findAll({
        where: { status: 'paid', provider: { [Op.ne]: 'credit' } },
        order: [['paidAt', 'DESC'], ['updatedAt', 'DESC']],
        limit: 6,
        include: [{
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
          include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }],
        }],
      }),
      AdminAuditLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: 6,
        include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
      }),
    ]);

    res.json({
      kpis: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminCount,
        usersThisMonth,
        totalEvents,
        eventsThisMonth,
        totalGuests,
        totalPhotos,
        totalMediaBytes: Number(totalMediaBytes) || 0,
        pendingPayments,
        failedPayments,
        salesCount: paid.length,
        creditRedemptions: creditRedemptions.length,
        creditRedeemedCents: creditRedemptions.reduce((sum, payment) => sum + (payment.amountCents || 0), 0),
        revenueCents,
        revenue: formatBRL(revenueCents),
        revenueMonthCents,
        revenueMonth: formatBRL(revenueMonthCents),
        salesThisMonth: paidThisMonth.length,
        avgTicketCents: paid.length ? Math.round(revenueCents / paid.length) : 0,
        avgTicket: formatBRL(paid.length ? Math.round(revenueCents / paid.length) : 0),
        paymentConversionRate: checkoutCount ? Math.round((paid.length / checkoutCount) * 1000) / 10 : 0,
      },
      eventsByStatus,
      salesSeries: Object.values(buckets),
      planDistribution,
      recentSales: recent.map((payment) => ({
        id: payment.id,
        planId: payment.planId,
        planLabel: getPlan(payment.planId)?.label || payment.planId,
        amountCents: payment.amountCents,
        amount: formatBRL(payment.amountCents),
        billingType: payment.billingType,
        paidAt: payment.paidAt || payment.updatedAt,
        eventName: payment.event?.name || '—',
        organizer: organizerSummary(payment.event?.organizer),
      })),
      recentAudit: recentAudit.map((item) => ({
        id: item.id,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        targetLabel: item.targetLabel,
        createdAt: item.createdAt,
        admin: organizerSummary(item.admin),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/users
async function listUsers(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (['user', 'admin'].includes(role)) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const { rows, count } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const users = await Promise.all(rows.map(async (user) => {
      const [eventCount, paidPlans] = await Promise.all([
        Event.count({ where: { userId: user.id } }),
        Plan.findAll({
          where: { status: 'paid', provider: { [Op.ne]: 'credit' } },
          include: [{ model: Event, as: 'event', attributes: [], where: { userId: user.id } }],
          raw: true,
        }),
      ]);
      const spentCents = paidPlans.reduce((sum, payment) => sum + (payment.amountCents || 0), 0);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        eventCount,
        spentCents,
        spent: formatBRL(spentCents),
        creditCents: user.creditCents || 0,
        credit: formatBRL(user.creditCents || 0),
      };
    }));

    res.json({ total: count, limit, offset, users });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/users/:id
async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const rawEvents = await Event.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']] });
    const events = await Promise.all(rawEvents.map((event) => serializeEvent(event)));
    const payments = await Plan.findAll({
      where: { status: 'paid', provider: { [Op.ne]: 'credit' } },
      include: [{ model: Event, as: 'event', attributes: ['id', 'name'], where: { userId: user.id } }],
      order: [['paidAt', 'DESC'], ['createdAt', 'DESC']],
    });
    const spentCents = payments.reduce((sum, payment) => sum + (payment.amountCents || 0), 0);

    return res.json({
      user: user.toJSON(),
      events,
      summary: {
        eventCount: events.length,
        activeEventCount: events.filter((event) => event.status === 'active').length,
        photoCount: events.reduce((sum, event) => sum + event.photoCount, 0),
        guestCount: events.reduce((sum, event) => sum + event.guestCount, 0),
        spentCents,
        spent: formatBRL(spentCents),
        creditCents: user.creditCents || 0,
        credit: formatBRL(user.creditCents || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id
async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const wantsRoleChange = req.body.role !== undefined;
    const wantsStatusChange = req.body.isActive !== undefined;
    if (wantsRoleChange && !['user', 'admin'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Papel de usuario invalido.' });
    }
    if (wantsStatusChange && typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ error: 'Status de usuario invalido.' });
    }

    const nextRole = wantsRoleChange ? req.body.role : user.role;
    const nextActive = wantsStatusChange ? req.body.isActive : user.isActive;
    if (user.id === req.user.id && (nextRole !== 'admin' || !nextActive)) {
      return res.status(400).json({ error: 'Voce nao pode remover ou desativar seu proprio acesso de super admin.' });
    }

    const removesActiveAdmin = user.role === 'admin' && user.isActive && (nextRole !== 'admin' || !nextActive);
    if (removesActiveAdmin) {
      const activeAdmins = await User.count({ where: { role: 'admin', isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: 'O sistema precisa manter pelo menos um super admin ativo.' });
      }
    }

    const changes = {};
    if (nextRole !== user.role) changes.role = { from: user.role, to: nextRole };
    if (nextActive !== user.isActive) changes.isActive = { from: user.isActive, to: nextActive };

    user.role = nextRole;
    user.isActive = nextActive;
    await user.save();

    if (Object.keys(changes).length) {
      await recordAdminAction(req, {
        action: 'user.updated',
        targetType: 'user',
        targetId: user.id,
        targetLabel: `${user.name} (${user.email})`,
        metadata: { changes },
      });
    }

    return res.json({ user: user.toJSON() });
  } catch (error) {
    return next(error);
  }
}

// POST /api/admin/users/:id/credits
// Concede (ou ajusta) o saldo de creditos de um usuario.
// Corpo: { amountCents, mode?: 'add' | 'set', reason? }
//  - mode 'add' (padrao): soma amountCents ao saldo (pode ser negativo para debitar)
//  - mode 'set': define o saldo exatamente como amountCents
async function grantCredit(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const amountCents = Math.round(Number(req.body.amountCents));
    const mode = req.body.mode === 'set' ? 'set' : 'add';
    const reason = typeof req.body.reason === 'string' ? req.body.reason.slice(0, 200) : null;

    if (!Number.isFinite(amountCents)) {
      return res.status(400).json({ error: 'Valor de credito invalido.' });
    }

    const previousCents = user.creditCents || 0;
    const nextCents = mode === 'set' ? amountCents : previousCents + amountCents;
    if (nextCents < 0) {
      return res.status(400).json({ error: 'O saldo de creditos nao pode ficar negativo.' });
    }

    user.creditCents = nextCents;
    await user.save();

    await recordAdminAction(req, {
      action: 'user.credit.granted',
      targetType: 'user',
      targetId: user.id,
      targetLabel: `${user.name} (${user.email})`,
      metadata: {
        mode,
        deltaCents: nextCents - previousCents,
        previousCents,
        balanceCents: nextCents,
        reason,
      },
    });

    return res.json({
      user: user.toJSON(),
      creditCents: nextCents,
      credit: formatBRL(nextCents),
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/events
async function listEvents(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const planId = String(req.query.planId || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
        { '$organizer.name$': { [Op.like]: `%${search}%` } },
        { '$organizer.email$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (Object.values(EVENT_STATUS).includes(status)) where.status = status;
    if (planId) where.planId = planId;

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
      subQuery: false,
      include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }],
    });
    const events = await Promise.all(rows.map(serializeEvent));
    res.json({ total: count, limit, offset, events });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/events/:id
async function getEvent(req, res, next) {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email', 'isActive'] }],
    });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });
    const payments = await Plan.findAll({ where: { eventId: event.id }, order: [['createdAt', 'DESC']] });
    return res.json({
      event: await serializeEvent(event),
      payments: payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        provider: payment.provider,
        billingType: payment.billingType,
        amountCents: payment.amountCents,
        amount: formatBRL(payment.amountCents),
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function loadAdminEvent(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Evento nao encontrado.' });
    return null;
  }
  return event;
}

// POST /api/admin/events/:id/close
async function closeEvent(req, res, next) {
  try {
    const event = await loadAdminEvent(req, res);
    if (!event) return;
    if (event.status === EVENT_STATUS.REVEALED) {
      return res.status(400).json({ error: 'Um evento revelado nao pode ser encerrado novamente.' });
    }
    const previousStatus = event.status;
    event.status = EVENT_STATUS.CLOSED;
    event.endsAt = new Date();
    await event.save();
    await recordAdminAction(req, {
      action: 'event.closed',
      targetType: 'event',
      targetId: event.id,
      targetLabel: event.name,
      metadata: { previousStatus },
    });
    return res.json({ event: await serializeEvent(event) });
  } catch (error) {
    return next(error);
  }
}

// POST /api/admin/events/:id/reveal
async function revealEvent(req, res, next) {
  try {
    const event = await loadAdminEvent(req, res);
    if (!event) return;
    const previousStatus = event.status;
    await Photo.update({ isVisible: true }, { where: { eventId: event.id } });
    event.status = EVENT_STATUS.REVEALED;
    event.revealAt = new Date();
    await event.save();
    await recordAdminAction(req, {
      action: 'event.revealed',
      targetType: 'event',
      targetId: event.id,
      targetLabel: event.name,
      metadata: { previousStatus },
    });

    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
    const albumUrl = `${base}/e/${event.slug}/album`;
    Guest.findAll({ where: { eventId: event.id, email: { [Op.not]: null } } })
      .then((guests) => Promise.all(guests.map((guest) => sendMail({
        to: guest.email,
        ...templates.guestAlbumReady(guest.nickname || 'convidado', event.name, albumUrl),
      }).catch(() => {}))))
      .catch(() => {});

    return res.json({ event: await serializeEvent(event), message: 'Album revelado.' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/admin/events/:id
async function deleteEvent(req, res, next) {
  try {
    const event = await loadAdminEvent(req, res);
    if (!event) return;
    const usage = await eventUsage(event.id);
    const photos = await Photo.findAll({ where: { eventId: event.id } });
    await Promise.all(photos.flatMap((photo) => [
      storage.remove(photo.storageKey).catch(() => {}),
      photo.thumbKey ? storage.remove(photo.thumbKey).catch(() => {}) : null,
    ].filter(Boolean)));

    await Promise.all([
      Photo.destroy({ where: { eventId: event.id } }),
      Guest.destroy({ where: { eventId: event.id } }),
      Plan.destroy({ where: { eventId: event.id } }),
    ]);
    await event.destroy();
    await recordAdminAction(req, {
      action: 'event.deleted',
      targetType: 'event',
      targetId: event.id,
      targetLabel: event.name,
      metadata: { status: event.status, ...usage },
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/payments
async function listPayments(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};
    if (['pending', 'paid', 'failed', 'refunded'].includes(status)) where.status = status;
    if (search) {
      where[Op.or] = [
        { providerPaymentId: { [Op.like]: `%${search}%` } },
        { '$event.name$': { [Op.like]: `%${search}%` } },
        { '$event.organizer.name$': { [Op.like]: `%${search}%` } },
        { '$event.organizer.email$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Plan.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
      subQuery: false,
      include: [{
        model: Event,
        as: 'event',
        attributes: ['id', 'name'],
        include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }],
      }],
    });

    const payments = rows.map((payment) => ({
      id: payment.id,
      providerPaymentId: payment.providerPaymentId,
      planId: payment.planId,
      planLabel: getPlan(payment.planId)?.label || payment.planId,
      amountCents: payment.amountCents,
      amount: formatBRL(payment.amountCents),
      provider: payment.provider,
      status: payment.status,
      billingType: payment.billingType,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      invoiceUrl: payment.invoiceUrl,
      eventName: payment.event?.name || '—',
      eventId: payment.event?.id || null,
      organizer: organizerSummary(payment.event?.organizer),
    }));
    res.json({ total: count, limit, offset, payments });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/audit-logs
async function listAuditLogs(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};
    if (action) where.action = action;
    if (search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { targetLabel: { [Op.like]: `%${search}%` } },
        { targetId: { [Op.like]: `%${search}%` } },
        { '$admin.name$': { [Op.like]: `%${search}%` } },
        { '$admin.email$': { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await AdminAuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
      subQuery: false,
      include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
    });
    res.json({
      total: count,
      limit,
      offset,
      logs: rows.map((item) => ({
        id: item.id,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        targetLabel: item.targetLabel,
        metadata: item.metadata,
        ip: item.ip,
        createdAt: item.createdAt,
        admin: organizerSummary(item.admin),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/system
async function systemStatus(req, res, next) {
  try {
    const databaseStartedAt = Date.now();
    await sequelize.authenticate();
    const databaseLatencyMs = Date.now() - databaseStartedAt;
    const paymentConfigured = Boolean(process.env.ASAAS_API_KEY);
    const emailProvider = process.env.RESEND_API_KEY ? 'Resend' : (process.env.SMTP_HOST ? 'SMTP' : 'Modo de desenvolvimento');
    const storageProvider = storage.useS3 ? 'Amazon S3' : 'Disco local';

    res.json({
      checkedAt: new Date().toISOString(),
      runtime: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: new Date(Date.now() - (process.uptime() * 1000)).toISOString(),
      },
      services: [
        {
          id: 'database',
          label: 'Banco de dados',
          provider: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
          status: 'operational',
          detail: `${databaseLatencyMs} ms de resposta`,
        },
        {
          id: 'storage',
          label: 'Armazenamento',
          provider: storageProvider,
          status: process.env.NODE_ENV === 'production' && !storage.useS3 ? 'attention' : 'operational',
          detail: storage.useS3 ? 'Objetos persistentes configurados' : 'Arquivos mantidos no servidor',
        },
        {
          id: 'payments',
          label: 'Pagamentos',
          provider: paymentConfigured ? `Asaas (${process.env.ASAAS_ENV || 'sandbox'})` : 'Mock local',
          status: paymentConfigured ? 'operational' : 'attention',
          detail: paymentConfigured ? 'Credencial configurada' : 'Sem gateway real configurado',
        },
        {
          id: 'email',
          label: 'Emails transacionais',
          provider: emailProvider,
          status: emailProvider === 'Modo de desenvolvimento' ? 'attention' : 'operational',
          detail: emailProvider === 'Modo de desenvolvimento' ? 'Mensagens apenas no console' : 'Provedor configurado',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/payments/:id — detalhe completo de uma cobrança
async function getPayment(req, res, next) {
  try {
    const payment = await Plan.findByPk(req.params.id, {
      include: [{
        model: Event,
        as: 'event',
        attributes: ['id', 'name', 'slug', 'status'],
        include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email', 'cpfCnpj'] }],
      }],
    });
    if (!payment) return res.status(404).json({ error: 'Cobrança não encontrada.' });

    const organizer = payment.event?.organizer;
    return res.json({
      payment: {
        id: payment.id,
        providerPaymentId: payment.providerPaymentId,
        planId: payment.planId,
        planLabel: getPlan(payment.planId)?.label || payment.planId,
        amountCents: payment.amountCents,
        amount: formatBRL(payment.amountCents),
        provider: payment.provider,
        status: payment.status,
        billingType: payment.billingType,
        invoiceUrl: payment.invoiceUrl,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        event: payment.event
          ? { id: payment.event.id, name: payment.event.name, slug: payment.event.slug, status: payment.event.status }
          : null,
        organizer: organizer
          ? { id: organizer.id, name: organizer.name, email: organizer.email, cpfCnpj: organizer.cpfCnpj || null }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/events/:id — edita campos do evento em nome do organizador
async function updateEvent(req, res, next) {
  try {
    const event = await loadAdminEvent(req, res);
    if (!event) return undefined;

    const EDITABLE = ['name', 'startsAt', 'endsAt', 'revealAt', 'welcomeMessage', 'venueName'];
    const changes = {};
    for (const field of EDITABLE) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];
      if (['startsAt', 'endsAt', 'revealAt'].includes(field)) {
        value = value ? new Date(value) : null;
      } else if (typeof value === 'string') {
        value = value.trim();
      }
      const before = event[field];
      const beforeCmp = before instanceof Date ? before.toISOString() : before;
      const afterCmp = value instanceof Date ? value.toISOString() : value;
      if (String(beforeCmp ?? '') !== String(afterCmp ?? '')) {
        changes[field] = { from: beforeCmp ?? null, to: afterCmp ?? null };
        event[field] = value;
      }
    }

    if (req.body.name !== undefined && !String(event.name || '').trim()) {
      return res.status(400).json({ error: 'O nome do evento não pode ficar vazio.' });
    }

    if (Object.keys(changes).length) {
      await event.save();
      await recordAdminAction(req, {
        action: 'event.updated',
        targetType: 'event',
        targetId: event.id,
        targetLabel: event.name,
        metadata: { changes },
      });
    }

    return res.json({ event: await serializeEvent(event) });
  } catch (error) {
    return next(error);
  }
}

// POST /api/admin/events/:id/branding-image?slot=cover|logo
async function uploadEventBranding(req, res, next) {
  try {
    const event = await loadAdminEvent(req, res);
    if (!event) return undefined;

    const file = req.file;
    if (!file || !file.buffer || !file.buffer.length) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    const SLOT_FIELD = { cover: 'coverImageUrl', logo: 'logoUrl' };
    const slot = SLOT_FIELD[req.query.slot] ? req.query.slot : 'cover';

    const { url } = await storage.saveObject({
      eventId: event.id,
      fileName: `${slot}-${file.originalname || 'img.jpg'}`,
      buffer: file.buffer,
      contentType: file.mimetype || 'image/jpeg',
      appUrl: process.env.APP_URL,
    });

    event[SLOT_FIELD[slot]] = url;
    await event.save();

    await recordAdminAction(req, {
      action: 'event.branding_updated',
      targetType: 'event',
      targetId: event.id,
      targetLabel: event.name,
      metadata: { slot },
    });

    return res.json({ ok: true, slot, url, event: await serializeEvent(event) });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/access-logs — logins, falhas e logouts
async function listAccessLogs(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const type = String(req.query.type || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};
    if (['login_success', 'login_failed', 'logout', 'password_reset'].includes(type)) where.type = type;
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { ip: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await AccessLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
      subQuery: false,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
    const { getBlockedSet } = require('../middlewares/ipBlockMiddleware');
    const blocked = getBlockedSet();
    return res.json({
      total: count,
      limit,
      offset,
      logs: rows.map((item) => ({
        id: item.id,
        type: item.type,
        reason: item.reason,
        email: item.email,
        ip: item.ip,
        ipBlocked: item.ip ? blocked.has(String(item.ip).trim()) : false,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
        user: organizerSummary(item.user),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/blocked-ips
async function listBlockedIps(req, res, next) {
  try {
    const rows = await BlockedIp.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }],
    });
    return res.json({
      blockedIps: rows.map((row) => ({
        id: row.id,
        ip: row.ip,
        reason: row.reason,
        createdAt: row.createdAt,
        createdBy: organizerSummary(row.createdBy),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/admin/blocked-ips  { ip, reason? }
async function blockIp(req, res, next) {
  try {
    const ip = String(req.body.ip || '').trim();
    const reason = String(req.body.reason || '').trim() || null;
    if (!ip) return res.status(400).json({ error: 'Informe um endereço IP.' });
    if (ip.length > 64) return res.status(400).json({ error: 'Endereço IP inválido.' });

    // Impede que o admin bloqueie o próprio IP e se tranque para fora
    const selfIp = req.ip || req.socket?.remoteAddress || '';
    if (ip === String(selfIp).trim()) {
      return res.status(400).json({ error: 'Você não pode bloquear o seu próprio endereço IP atual.' });
    }

    const [row, created] = await BlockedIp.findOrCreate({
      where: { ip },
      defaults: { ip, reason, createdByUserId: req.user.id },
    });
    if (!created && reason && row.reason !== reason) {
      row.reason = reason;
      await row.save();
    }

    await refreshBlockedIps();
    await recordAdminAction(req, {
      action: 'ip.blocked',
      targetType: 'ip',
      targetId: ip,
      targetLabel: ip,
      metadata: { reason: reason || '—' },
    });

    return res.status(created ? 201 : 200).json({ ok: true, blockedIp: { id: row.id, ip: row.ip, reason: row.reason, createdAt: row.createdAt } });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/admin/blocked-ips/:id
async function unblockIp(req, res, next) {
  try {
    const row = await BlockedIp.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
    const ip = row.ip;
    await row.destroy();
    await refreshBlockedIps();
    await recordAdminAction(req, {
      action: 'ip.unblocked',
      targetType: 'ip',
      targetId: ip,
      targetLabel: ip,
      metadata: {},
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Afiliados / Comissoes
// ---------------------------------------------------------------------------

// GET /api/admin/commissions — lista comissoes com filtros + totais globais.
async function listCommissions(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const { limit, offset } = pagination(req.query);
    const where = {};
    if (['pending', 'paid', 'canceled'].includes(status)) where.status = status;
    if (search) {
      where[Op.or] = [
        { '$affiliate.name$': { [Op.like]: `%${search}%` } },
        { '$affiliate.email$': { [Op.like]: `%${search}%` } },
        { '$referred.name$': { [Op.like]: `%${search}%` } },
        { '$referred.email$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Commission.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
      subQuery: false,
      include: [
        { model: User, as: 'affiliate', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'referred', attributes: ['id', 'name', 'email'] },
        { model: Event, as: 'event', attributes: ['id', 'name'] },
      ],
    });

    // Totais globais (todas as comissoes, nao so a pagina) por status.
    const allRows = await Commission.findAll({ attributes: ['status', 'commissionCents'], raw: true });
    const totals = allRows.reduce((acc, row) => {
      const cents = row.commissionCents || 0;
      acc[row.status] = (acc[row.status] || 0) + cents;
      return acc;
    }, {});
    const pendingCents = totals.pending || 0;
    const paidCents = totals.paid || 0;

    res.json({
      total: count,
      limit,
      offset,
      rateLabel: formatRate(DEFAULT_RATE_BPS),
      summary: {
        pendingCents,
        pending: formatBRL(pendingCents),
        paidCents,
        paid: formatBRL(paidCents),
        commissionCount: allRows.length,
      },
      commissions: rows.map((c) => ({
        id: c.id,
        status: c.status,
        saleAmountCents: c.saleAmountCents,
        saleAmount: formatBRL(c.saleAmountCents),
        commissionCents: c.commissionCents,
        commission: formatBRL(c.commissionCents),
        rateLabel: formatRate(c.rateBps),
        note: c.note,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
        affiliate: organizerSummary(c.affiliate),
        referred: organizerSummary(c.referred),
        eventName: c.event?.name || '—',
        eventId: c.event?.id || null,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/commissions/:id — muda status (paid | pending | canceled) + nota.
async function updateCommission(req, res, next) {
  try {
    const commission = await Commission.findByPk(req.params.id, {
      include: [{ model: User, as: 'affiliate', attributes: ['id', 'name', 'email'] }],
    });
    if (!commission) return res.status(404).json({ error: 'Comissao nao encontrada.' });

    const nextStatus = req.body.status;
    if (nextStatus !== undefined && !['pending', 'paid', 'canceled'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Status de comissao invalido.' });
    }

    const previousStatus = commission.status;
    if (nextStatus && nextStatus !== previousStatus) {
      commission.status = nextStatus;
      commission.paidAt = nextStatus === 'paid' ? new Date() : null;
    }
    if (req.body.note !== undefined) {
      commission.note = req.body.note ? String(req.body.note).slice(0, 200) : null;
    }
    await commission.save();

    await recordAdminAction(req, {
      action: 'commission.updated',
      targetType: 'commission',
      targetId: commission.id,
      targetLabel: commission.affiliate ? `${commission.affiliate.name} (${commission.affiliate.email})` : commission.id,
      metadata: {
        status: { from: previousStatus, to: commission.status },
        commissionCents: commission.commissionCents,
      },
    });

    return res.json({
      commission: {
        id: commission.id,
        status: commission.status,
        commissionCents: commission.commissionCents,
        commission: formatBRL(commission.commissionCents),
        note: commission.note,
        paidAt: commission.paidAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/affiliates — ranking de afiliados por ganhos/indicacoes.
async function listAffiliates(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const { limit, offset } = pagination(req.query);

    // Considera afiliado quem ja tem ao menos uma indicacao OU comissao.
    const referrerIdRows = await User.findAll({
      attributes: [[fn('DISTINCT', col('referredByUserId')), 'id']],
      where: { referredByUserId: { [Op.ne]: null } },
      raw: true,
    });
    const commissionAffiliateRows = await Commission.findAll({
      attributes: [[fn('DISTINCT', col('affiliateUserId')), 'id']],
      raw: true,
    });
    const affiliateIds = [...new Set([
      ...referrerIdRows.map((r) => r.id),
      ...commissionAffiliateRows.map((r) => r.id),
    ].filter(Boolean))];

    if (!affiliateIds.length) {
      return res.json({ total: 0, limit, offset, affiliates: [] });
    }

    const where = { id: { [Op.in]: affiliateIds } };
    if (search) {
      where[Op.and] = [{ [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { referralCode: { [Op.like]: `%${search}%` } },
      ] }];
    }

    const users = await User.findAll({ where });

    const enriched = await Promise.all(users.map(async (user) => {
      const [referralCount, commissions] = await Promise.all([
        User.count({ where: { referredByUserId: user.id } }),
        Commission.findAll({ where: { affiliateUserId: user.id }, attributes: ['status', 'commissionCents'], raw: true }),
      ]);
      const pendingCents = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + (c.commissionCents || 0), 0);
      const paidCents = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + (c.commissionCents || 0), 0);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        isActive: user.isActive,
        referralCount,
        salesCount: commissions.filter((c) => c.status !== 'canceled').length,
        pendingCents,
        pending: formatBRL(pendingCents),
        paidCents,
        paid: formatBRL(paidCents),
        totalCents: pendingCents + paidCents,
        total: formatBRL(pendingCents + paidCents),
      };
    }));

    enriched.sort((a, b) => b.totalCents - a.totalCents || b.referralCount - a.referralCount);
    const paged = enriched.slice(offset, offset + limit);

    return res.json({ total: enriched.length, limit, offset, affiliates: paged });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  overview,
  listCommissions,
  updateCommission,
  listAffiliates,
  listUsers,
  getUser,
  updateUser,
  grantCredit,
  listEvents,
  getEvent,
  updateEvent,
  uploadEventBranding,
  closeEvent,
  revealEvent,
  deleteEvent,
  listPayments,
  getPayment,
  listAuditLogs,
  listAccessLogs,
  listBlockedIps,
  blockIp,
  unblockIp,
  systemStatus,
};
