const { User, Event, Commission } = require('../models');
const { formatBRL, getPlan } = require('../config/plans');
const { DEFAULT_RATE_BPS, formatRate } = require('../config/affiliate');
const { ensureReferralCode } = require('../services/affiliateService');

function frontBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

// Soma as comissoes por status.
function sumByStatus(commissions) {
  const acc = { pending: 0, paid: 0, canceled: 0, total: 0 };
  for (const c of commissions) {
    const cents = c.commissionCents || 0;
    if (acc[c.status] != null) acc[c.status] += cents;
    if (c.status !== 'canceled') acc.total += cents;
  }
  return acc;
}

/**
 * GET /api/affiliate/me
 * Painel do afiliado: link de indicacao, ganhos e listas de indicados/comissoes.
 */
async function getMyAffiliate(req, res, next) {
  try {
    // Garante que o usuario tem um codigo de indicacao.
    const referralCode = await ensureReferralCode(req.user);

    const [referrals, commissions] = await Promise.all([
      User.findAll({
        where: { referredByUserId: req.user.id },
        attributes: ['id', 'name', 'email', 'createdAt'],
        order: [['createdAt', 'DESC']],
      }),
      Commission.findAll({
        where: { affiliateUserId: req.user.id },
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'referred', attributes: ['id', 'name', 'email'] },
          { model: Event, as: 'event', attributes: ['id', 'name'] },
        ],
      }),
    ]);

    const totals = sumByStatus(commissions);

    // Quantas indicacoes ja geraram ao menos uma compra (comissao).
    const buyerIds = new Set(commissions.map((c) => c.referredUserId));

    res.json({
      referralCode,
      referralLink: `${frontBase()}/register?ref=${referralCode}`,
      rateBps: DEFAULT_RATE_BPS,
      rateLabel: formatRate(DEFAULT_RATE_BPS),
      stats: {
        referralCount: referrals.length,
        convertedCount: buyerIds.size,
        salesCount: commissions.filter((c) => c.status !== 'canceled').length,
        pendingCents: totals.pending,
        pending: formatBRL(totals.pending),
        paidCents: totals.paid,
        paid: formatBRL(totals.paid),
        totalCents: totals.total,
        total: formatBRL(totals.total),
      },
      referrals: referrals.map((u) => ({
        id: u.id,
        name: u.name,
        email: maskEmail(u.email),
        joinedAt: u.createdAt,
        hasPurchased: buyerIds.has(u.id),
      })),
      commissions: commissions.map((c) => ({
        id: c.id,
        status: c.status,
        saleAmountCents: c.saleAmountCents,
        saleAmount: formatBRL(c.saleAmountCents),
        commissionCents: c.commissionCents,
        commission: formatBRL(c.commissionCents),
        rateLabel: formatRate(c.rateBps),
        createdAt: c.createdAt,
        paidAt: c.paidAt,
        referredName: c.referred?.name || '—',
        eventName: c.event?.name || '—',
      })),
    });
  } catch (error) {
    next(error);
  }
}

// Oculta parcialmente o email do indicado (privacidade do afiliado).
function maskEmail(email) {
  const str = String(email || '');
  const [user, domain] = str.split('@');
  if (!domain) return str;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

module.exports = { getMyAffiliate };
