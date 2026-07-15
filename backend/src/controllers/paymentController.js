const { Event, Plan, User } = require('../models');
const { EVENT_STATUS } = require('../config/constants');
const { getPlan } = require('../config/plans');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');
const asaas = require('../config/asaas');

/**
 * Pagamentos via Asaas (Pix, boleto e cartão).
 *
 * - Com ASAAS_API_KEY: cria a cobrança de verdade e retorna a invoiceUrl
 *   (página de pagamento hospedada). A ativação do evento acontece pelo
 *   webhook do Asaas (PAYMENT_CONFIRMED / PAYMENT_RECEIVED).
 * - Sem chave (dev): MODO MOCK — cria a "sessão" e devolve uma URL interna
 *   do próprio app, confirmada manualmente via /confirm.
 */

function frontBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
}

// POST /api/payments/checkout  (organizador) — cria cobrança e devolve o link
async function checkout(req, res, next) {
  try {
    const { eventId, planId } = req.body;
    const event = await Event.findOne({ where: { id: eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const plan = getPlan(planId || event.planId);
    if (!plan) return res.status(400).json({ error: 'Plano invalido.' });

    // Plano gratuito: ativa direto, sem cobrança
    if (plan.priceCents === 0) {
      event.planId = plan.id;
      event.maxGuests = plan.maxGuests;
      event.isPaid = true;
      event.status = EVENT_STATUS.ACTIVE;
      await event.save();
      return res.json({ free: true, event: { id: event.id, status: event.status } });
    }

    // Evita cobrança duplicada: reaproveita uma pendente do mesmo plano
    let payment = await Plan.findOne({
      where: { eventId: event.id, planId: plan.id, status: 'pending' },
      order: [['createdAt', 'DESC']],
    });

    // Atualiza o plano escolhido no evento (ainda não pago)
    event.planId = plan.id;
    event.maxGuests = plan.maxGuests;
    await event.save();

    // ---------- MODO REAL (Asaas) ----------
    if (asaas.useAsaas) {
      try {
        const customerId = await asaas.ensureCustomer({
          name: req.user.name,
          email: req.user.email,
          cpfCnpj: req.user.cpfCnpj || req.body.cpfCnpj,
        });

        if (!payment) {
          payment = await Plan.create({
            eventId: event.id,
            planId: plan.id,
            amountCents: plan.priceCents,
            provider: 'asaas',
            status: 'pending',
          });
        }

        const charge = await asaas.createPayment({
          customerId,
          amountCents: plan.priceCents,
          description: `Era Uma Vez — ${plan.label} — evento "${event.name}"`,
          externalReference: payment.id,
        });

        payment.provider = 'asaas';
        payment.providerPaymentId = charge.id;
        payment.invoiceUrl = charge.invoiceUrl;
        await payment.save();

        return res.json({
          free: false,
          provider: 'asaas',
          paymentId: payment.id,
          checkoutUrl: charge.invoiceUrl,
          amountCents: plan.priceCents,
        });
      } catch (e) {
        return res.status(502).json({ error: `Falha ao criar cobranca no Asaas: ${e.message}` });
      }
    }

    // ---------- MODO MOCK (dev, sem chave) ----------
    if (!payment) {
      payment = await Plan.create({
        eventId: event.id,
        planId: plan.id,
        amountCents: plan.priceCents,
        provider: 'mock',
        providerSessionId: `mock_sess_${Date.now()}`,
        status: 'pending',
      });
    }
    return res.json({
      free: false,
      provider: 'mock',
      paymentId: payment.id,
      sessionId: payment.providerSessionId,
      checkoutUrl: `${frontBase()}/events/${event.id}/checkout?payment=${payment.id}`,
      amountCents: plan.priceCents,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/confirm  (organizador) — confirma pagamento MOCK
// (No modo real isto é feito pelo webhook do Asaas.)
async function confirmMock(req, res, next) {
  try {
    if (asaas.useAsaas) {
      return res.status(400).json({ error: 'Confirmacao manual indisponivel em producao. Use o checkout do Asaas.' });
    }
    const { paymentId, sessionId } = req.body;
    const where = paymentId ? { id: paymentId } : { providerSessionId: sessionId };
    const payment = await Plan.findOne({ where });
    if (!payment) return res.status(404).json({ error: 'Cobranca nao encontrada.' });

    const event = await Event.findOne({ where: { id: payment.eventId, userId: req.user.id } });
    if (!event) return res.status(403).json({ error: 'Sem permissao.' });

    await activatePaidEvent(event, payment);
    res.json({ ok: true, event: { id: event.id, status: event.status } });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/status/:paymentId (organizador) — consulta status
async function paymentStatus(req, res, next) {
  try {
    const payment = await Plan.findByPk(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Cobranca nao encontrada.' });
    const event = await Event.findOne({ where: { id: payment.eventId, userId: req.user.id } });
    if (!event) return res.status(403).json({ error: 'Sem permissao.' });

    // Em modo real, sincroniza com o Asaas (caso o webhook ainda não tenha chegado)
    if (asaas.useAsaas && payment.status === 'pending' && payment.providerPaymentId) {
      try {
        const remote = await asaas.getPayment(payment.providerPaymentId);
        if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(remote.status)) {
          await activatePaidEvent(event, payment, remote.billingType);
        }
      } catch (e) { /* ignora, retorna o que temos */ }
    }

    res.json({
      status: payment.status,
      provider: payment.provider,
      eventStatus: event.status,
      isPaid: event.isPaid,
      invoiceUrl: payment.invoiceUrl,
      amountCents: payment.amountCents,
      planId: payment.planId,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/webhook — webhook do Asaas
// Configurado em Asaas > Integrações > Webhooks, com um token em asaas-access-token.
async function webhook(req, res) {
  try {
    // Validação do token do webhook (defina ASAAS_WEBHOOK_TOKEN e o mesmo no painel Asaas)
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expected) {
      const got = req.headers['asaas-access-token'];
      if (got !== expected) return res.status(401).json({ error: 'unauthorized' });
    }

    // req.body vem como Buffer (express.raw). Faz o parse manual.
    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      try { payload = JSON.parse(payload.toString('utf8')); } catch { payload = {}; }
    }

    const event = payload?.event;
    const pay = payload?.payment;
    if (!event || !pay) return res.json({ received: true });

    const paidEvents = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH'];
    if (paidEvents.includes(event)) {
      // externalReference = id do nosso registro Plan
      const payment = pay.externalReference
        ? await Plan.findByPk(pay.externalReference)
        : await Plan.findOne({ where: { providerPaymentId: pay.id } });

      if (payment && payment.status !== 'paid') {
        const ev = await Event.findByPk(payment.eventId);
        if (ev) await activatePaidEvent(ev, payment, pay.billingType);
      }
    }

    res.json({ received: true });
  } catch (err) {
    // Retorna 200 para o Asaas não reenviar em loop por erro nosso; loga.
    console.error('[payments] erro no webhook:', err.message);
    res.json({ received: true });
  }
}

async function activatePaidEvent(event, payment, billingType) {
  payment.status = 'paid';
  payment.paidAt = new Date();
  if (billingType) payment.billingType = billingType;
  await payment.save();

  event.isPaid = true;
  event.pricePaidCents = payment.amountCents;
  if (event.status === EVENT_STATUS.DRAFT) event.status = EVENT_STATUS.ACTIVE;
  await event.save();

  // Email de confirmação
  try {
    const user = await User.findByPk(event.userId);
    if (user) {
      const tpl = templates.paymentConfirmed(user.name, event.name, `${frontBase()}/events/${event.id}`);
      await sendMail({ to: user.email, ...tpl }).catch(() => {});
    }
  } catch (e) { /* ignora */ }
}

module.exports = { checkout, confirmMock, paymentStatus, webhook, activatePaidEvent };
