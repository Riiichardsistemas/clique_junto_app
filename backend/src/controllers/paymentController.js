const { Event, Plan, User } = require('../models');
const { EVENT_STATUS } = require('../config/constants');
const { getPlan } = require('../config/plans');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');

/**
 * MODO MOCK (sem chaves de pagamento).
 * O fluxo replica o de Stripe/Pagar.me: cria uma "sessao" de checkout e
 * retorna uma URL. Aqui a URL aponta para o proprio frontend, que confirma
 * o pagamento simulado chamando /confirm. Quando integrar Stripe/Pagar.me,
 * basta trocar a criacao da sessao e validar o webhook real.
 */

// POST /api/payments/checkout  (organizador) — cria sessao
async function checkout(req, res, next) {
  try {
    const { eventId, planId } = req.body;
    const event = await Event.findOne({ where: { id: eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const plan = getPlan(planId || event.planId);
    if (!plan) return res.status(400).json({ error: 'Plano invalido.' });

    if (plan.priceCents === 0) {
      // Gratuito: ativa direto
      event.planId = plan.id;
      event.maxGuests = plan.maxGuests;
      event.isPaid = true;
      event.status = EVENT_STATUS.ACTIVE;
      await event.save();
      return res.json({ free: true, event: { id: event.id } });
    }

    const payment = await Plan.create({
      eventId: event.id,
      planId: plan.id,
      amountCents: plan.priceCents,
      provider: 'mock',
      providerSessionId: `mock_sess_${Date.now()}`,
      status: 'pending',
    });

    // Atualiza o plano escolhido no evento (ainda nao pago)
    event.planId = plan.id;
    event.maxGuests = plan.maxGuests;
    await event.save();

    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
    res.json({
      free: false,
      provider: 'mock',
      sessionId: payment.providerSessionId,
      // No mock, o checkout acontece numa tela do proprio app
      checkoutUrl: `${base}/events/${event.id}/checkout?session=${payment.providerSessionId}`,
      amountCents: plan.priceCents,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/confirm  (organizador) — confirma pagamento simulado
// (No mundo real isto seria feito pelo webhook do provedor.)
async function confirmMock(req, res, next) {
  try {
    const { sessionId } = req.body;
    const payment = await Plan.findOne({ where: { providerSessionId: sessionId } });
    if (!payment) return res.status(404).json({ error: 'Sessao nao encontrada.' });

    const event = await Event.findOne({ where: { id: payment.eventId, userId: req.user.id } });
    if (!event) return res.status(403).json({ error: 'Sem permissao.' });

    await activatePaidEvent(event, payment);
    res.json({ ok: true, event: { id: event.id, status: event.status } });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/webhook  — webhook real (Stripe/Pagar.me) [estrutura pronta]
async function webhook(req, res) {
  // Em producao: validar assinatura (STRIPE_WEBHOOK_SECRET), extrair eventId
  // do metadata, localizar o Plan e chamar activatePaidEvent.
  // Mantido como stub seguro: nao ativa nada sem validacao.
  console.log('[payments] webhook recebido (stub).');
  res.json({ received: true });
}

async function activatePaidEvent(event, payment) {
  payment.status = 'paid';
  await payment.save();

  event.isPaid = true;
  event.pricePaidCents = payment.amountCents;
  if (event.status === EVENT_STATUS.DRAFT) event.status = EVENT_STATUS.ACTIVE;
  await event.save();

  // Email de confirmacao
  try {
    const user = await User.findByPk(event.userId);
    if (user) {
      const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
      const tpl = templates.paymentConfirmed(user.name, event.name, `${base}/events/${event.id}`);
      await sendMail({ to: user.email, ...tpl }).catch(() => {});
    }
  } catch (e) { /* ignora */ }
}

module.exports = { checkout, confirmMock, webhook, activatePaidEvent };
