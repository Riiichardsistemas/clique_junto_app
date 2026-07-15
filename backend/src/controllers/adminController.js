const { Op, fn, col } = require('sequelize');
const { User, Event, Guest, Photo, Plan } = require('../models');
const { getPlan, formatBRL } = require('../config/plans');

/**
 * Painel do super-admin: métricas de vendas e gestão de usuários/eventos.
 * Todas as rotas passam por authMiddleware + adminMiddleware.
 */

// GET /api/admin/overview — KPIs gerais + série de vendas (30 dias)
async function overview(req, res, next) {
  try {
    const [totalUsers, totalEvents, totalGuests, totalPhotos] = await Promise.all([
      User.count(),
      Event.count(),
      Guest.count(),
      Photo.count(),
    ]);

    // Eventos por status
    const statusRows = await Event.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const eventsByStatus = statusRows.reduce((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {});

    // Todas as vendas pagas
    const paid = await Plan.findAll({ where: { status: 'paid' }, raw: true });
    const revenueCents = paid.reduce((s, p) => s + (p.amountCents || 0), 0);
    const salesCount = paid.length;

    // Receita e vendas do mês corrente
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = paid.filter((p) => new Date(p.paidAt || p.updatedAt) >= monthStart);
    const revenueMonthCents = paidThisMonth.reduce((s, p) => s + (p.amountCents || 0), 0);

    // Série de vendas dos últimos 30 dias (bucket por dia, em JS = DB-agnóstico)
    const days = 30;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), sales: 0, revenueCents: 0 };
    }
    paid.forEach((p) => {
      const key = new Date(p.paidAt || p.updatedAt).toISOString().slice(0, 10);
      if (buckets[key]) { buckets[key].sales += 1; buckets[key].revenueCents += p.amountCents || 0; }
    });
    const salesSeries = Object.values(buckets);

    // Distribuição por plano (pagos)
    const planDist = {};
    paid.forEach((p) => {
      planDist[p.planId] = planDist[p.planId] || { planId: p.planId, count: 0, revenueCents: 0 };
      planDist[p.planId].count += 1;
      planDist[p.planId].revenueCents += p.amountCents || 0;
    });
    const planDistribution = Object.values(planDist)
      .map((x) => ({ ...x, label: getPlan(x.planId)?.label || x.planId }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

    // Últimas vendas
    const recent = await Plan.findAll({
      where: { status: 'paid' },
      order: [['paidAt', 'DESC'], ['updatedAt', 'DESC']],
      limit: 8,
      include: [{ model: Event, as: 'event', attributes: ['id', 'name'], include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }] }],
    });
    const recentSales = recent.map((p) => ({
      id: p.id,
      planId: p.planId,
      planLabel: getPlan(p.planId)?.label || p.planId,
      amountCents: p.amountCents,
      amount: formatBRL(p.amountCents),
      billingType: p.billingType,
      paidAt: p.paidAt || p.updatedAt,
      eventName: p.event?.name || '—',
      organizer: p.event?.organizer ? { name: p.event.organizer.name, email: p.event.organizer.email } : null,
    }));

    res.json({
      kpis: {
        totalUsers,
        totalEvents,
        totalGuests,
        totalPhotos,
        salesCount,
        revenueCents,
        revenue: formatBRL(revenueCents),
        revenueMonthCents,
        revenueMonth: formatBRL(revenueMonthCents),
        salesThisMonth: paidThisMonth.length,
        avgTicketCents: salesCount ? Math.round(revenueCents / salesCount) : 0,
        avgTicket: formatBRL(salesCount ? Math.round(revenueCents / salesCount) : 0),
      },
      eventsByStatus,
      salesSeries,
      planDistribution,
      recentSales,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users — lista com busca e paginação
async function listUsers(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const offset = Number(req.query.offset) || 0;

    const where = search
      ? { [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ] }
      : {};

    const { rows, count } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const users = await Promise.all(rows.map(async (u) => {
      const [eventCount, paidPlans] = await Promise.all([
        Event.count({ where: { userId: u.id } }),
        Plan.findAll({
          where: { status: 'paid' },
          include: [{ model: Event, as: 'event', attributes: [], where: { userId: u.id } }],
          raw: true,
        }),
      ]);
      const spentCents = paidPlans.reduce((s, p) => s + (p.amountCents || 0), 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        eventCount,
        spentCents,
        spent: formatBRL(spentCents),
      };
    }));

    res.json({ total: count, users });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id — detalhe + eventos do usuário
async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });
    const events = await Event.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ user: user.toJSON(), events });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id — ativa/desativa ou muda role
async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    // Proteção: não permitir que o admin remova o próprio acesso de admin
    if (user.id === req.user.id && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'Voce nao pode remover seu proprio acesso de admin.' });
    }

    if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
    if (req.body.role && ['user', 'admin'].includes(req.body.role)) user.role = req.body.role;
    await user.save();
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/events — todos os eventos
async function listEvents(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const offset = Number(req.query.offset) || 0;

    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (status) where.status = status;

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }],
    });

    const events = await Promise.all(rows.map(async (ev) => {
      const [guestCount, photoCount] = await Promise.all([
        Guest.count({ where: { eventId: ev.id } }),
        Photo.count({ where: { eventId: ev.id } }),
      ]);
      return {
        id: ev.id,
        name: ev.name,
        slug: ev.slug,
        type: ev.type,
        status: ev.status,
        planId: ev.planId,
        isPaid: ev.isPaid,
        pricePaidCents: ev.pricePaidCents,
        createdAt: ev.createdAt,
        revealAt: ev.revealAt,
        organizer: ev.organizer ? { id: ev.organizer.id, name: ev.organizer.name, email: ev.organizer.email } : null,
        guestCount,
        photoCount,
      };
    }));

    res.json({ total: count, events });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments — todas as cobranças (vendas)
async function listPayments(req, res, next) {
  try {
    const status = (req.query.status || '').trim();
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const offset = Number(req.query.offset) || 0;

    const where = {};
    if (status) where.status = status;

    const { rows, count } = await Plan.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: Event, as: 'event', attributes: ['id', 'name'], include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }] }],
    });

    const payments = rows.map((p) => ({
      id: p.id,
      planId: p.planId,
      planLabel: getPlan(p.planId)?.label || p.planId,
      amountCents: p.amountCents,
      amount: formatBRL(p.amountCents),
      provider: p.provider,
      status: p.status,
      billingType: p.billingType,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      invoiceUrl: p.invoiceUrl,
      eventName: p.event?.name || '—',
      eventId: p.event?.id || null,
      organizer: p.event?.organizer ? { name: p.event.organizer.name, email: p.event.organizer.email } : null,
    }));

    res.json({ total: count, payments });
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, listUsers, getUser, updateUser, listEvents, listPayments };
