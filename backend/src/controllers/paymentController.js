const { Event, Plan, User, sequelize } = require('../models');
const { EVENT_STATUS } = require('../config/constants');
const { getPlan, isCustomPlan } = require('../config/plans');
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

    // Plano personalizado (sob consulta): nao entra no checkout automatico.
    if (isCustomPlan(plan)) {
      return res.status(400).json({
        error: 'Este plano é sob consulta. Fale com a gente para liberar seu evento.',
        custom: true,
      });
    }

    // Plano gratuito: ativa direto, sem cobrança
    if (plan.priceCents === 0) {
      event.planId = plan.id;
      event.maxGuests = plan.maxGuests;
      event.maxPhotos = plan.capacity != null ? plan.capacity : 0;
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
    event.maxPhotos = plan.capacity != null ? plan.capacity : 0;
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
          description: `Clique Junto — ${plan.label} — evento "${event.name}"`,
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
    // Validação do token do webhook (defina ASAAS_WEBHOOK_TOKEN e o mesmo no painel Asaas).
    // O token e OBRIGATORIO quando o gateway real esta ativo: sem ele, qualquer um
    // poderia liberar um evento pago via POST. Recusa a requisicao se nao configurado.
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    if (asaas.useAsaas && !expected) {
      console.error('[payments] webhook recebido sem ASAAS_WEBHOOK_TOKEN configurado — recusado.');
      return res.status(503).json({ error: 'webhook not configured' });
    }
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

// Carrega evento do organizador + valida plano pago. Retorna { event, plan } ou envia erro.
async function loadPaidTarget(req, res) {
  const { eventId, planId } = req.body;
  const event = await Event.findOne({ where: { id: eventId, userId: req.user.id } });
  if (!event) { res.status(404).json({ error: 'Evento nao encontrado.' }); return null; }
  const plan = getPlan(planId || event.planId);
  if (!plan) { res.status(400).json({ error: 'Plano invalido.' }); return null; }
  if (isCustomPlan(plan)) { res.status(400).json({ error: 'Este plano é sob consulta. Fale com a gente para liberar seu evento.', custom: true }); return null; }
  if (plan.priceCents === 0) { res.status(400).json({ error: 'Plano gratuito nao requer pagamento.' }); return null; }
  // Fixa o plano escolhido no evento (ainda nao pago)
  event.planId = plan.id;
  event.maxGuests = plan.maxGuests;
  event.maxPhotos = plan.capacity != null ? plan.capacity : 0;
  await event.save();
  return { event, plan };
}

async function getOrCreatePending(event, plan, provider) {
  let payment = await Plan.findOne({
    where: { eventId: event.id, planId: plan.id, status: 'pending' },
    order: [['createdAt', 'DESC']],
  });
  if (!payment) {
    payment = await Plan.create({
      eventId: event.id, planId: plan.id, amountCents: plan.priceCents, provider, status: 'pending',
    });
  }
  return payment;
}

// POST /api/payments/pix (organizador) — cobrança PIX com QR Code no app
async function pixCheckout(req, res, next) {
  try {
    const target = await loadPaidTarget(req, res);
    if (!target) return;
    const { event, plan } = target;
    const payment = await getOrCreatePending(event, plan, asaas.useAsaas ? 'asaas' : 'mock');
    const description = `Clique Junto — ${plan.label} — evento "${event.name}"`;

    if (asaas.useAsaas) {
      try {
        const customerId = await asaas.ensureCustomer({
          name: req.user.name, email: req.user.email, cpfCnpj: req.user.cpfCnpj || req.body.cpfCnpj,
        });
        const charge = await asaas.createPixCharge({
          customerId, amountCents: plan.priceCents, description, externalReference: payment.id,
        });
        payment.provider = 'asaas';
        payment.providerPaymentId = charge.id;
        payment.invoiceUrl = charge.invoiceUrl;
        payment.billingType = 'PIX';
        await payment.save();
        return res.json({ paymentId: payment.id, method: 'pix', amountCents: plan.priceCents, pix: charge.pix });
      } catch (e) {
        return res.status(502).json({ error: `Falha ao gerar Pix no Asaas: ${e.message}` });
      }
    }

    // ----- MOCK: gera um QR real (payload fake) para testar a experiência -----
    payment.billingType = 'PIX';
    await payment.save();
    // eslint-disable-next-line global-require
    const QRCode = require('qrcode');
    const payload = `00020126MOCK-PIX-${payment.id}-${plan.priceCents}5204000053039865802BR6009SAO PAULO`;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
    const encodedImage = dataUrl.replace(/^data:image\/png;base64,/, '');
    return res.json({
      paymentId: payment.id, method: 'pix', amountCents: plan.priceCents, mock: true,
      pix: { encodedImage, payload },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/card (organizador) — cobrança no cartão (dados do cartão no corpo)
async function cardCheckout(req, res, next) {
  try {
    const target = await loadPaidTarget(req, res);
    if (!target) return;
    const { event, plan } = target;
    const { card, holderInfo } = req.body;

    // Validação básica dos campos do cartão
    const need = card && card.holderName && card.number && card.expiryMonth && card.expiryYear && card.ccv;
    const needHolder = holderInfo && holderInfo.cpfCnpj && holderInfo.postalCode && holderInfo.addressNumber && holderInfo.phone;
    if (!need || !needHolder) {
      return res.status(400).json({ error: 'Preencha todos os dados do cartão e do titular.' });
    }

    const payment = await getOrCreatePending(event, plan, asaas.useAsaas ? 'asaas' : 'mock');
    const description = `Clique Junto — ${plan.label} — evento "${event.name}"`;
    const remoteIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;

    if (asaas.useAsaas) {
      try {
        const customerId = await asaas.ensureCustomer({
          name: req.user.name, email: req.user.email, cpfCnpj: holderInfo.cpfCnpj,
        });
        const charge = await asaas.createCardCharge({
          customerId, amountCents: plan.priceCents, description, externalReference: payment.id,
          card,
          holderInfo: { name: holderInfo.name || req.user.name, email: holderInfo.email || req.user.email, cpfCnpj: holderInfo.cpfCnpj, postalCode: holderInfo.postalCode, addressNumber: holderInfo.addressNumber, phone: holderInfo.phone },
          remoteIp,
        });
        payment.provider = 'asaas';
        payment.providerPaymentId = charge.id;
        payment.billingType = 'CREDIT_CARD';
        await payment.save();

        const approved = ['CONFIRMED', 'RECEIVED'].includes(charge.status);
        if (approved) await activatePaidEvent(event, payment, 'CREDIT_CARD');
        return res.json({
          paymentId: payment.id, method: 'card',
          status: approved ? 'paid' : 'pending',
          eventStatus: event.status,
        });
      } catch (e) {
        return res.status(402).json({ error: `Pagamento recusado: ${e.message}` });
      }
    }

    // ----- MOCK: aprova cartões que não terminam em 0000 (para testar recusa) -----
    payment.billingType = 'CREDIT_CARD';
    await payment.save();
    const num = String(card.number).replace(/\s+/g, '');
    if (num.endsWith('0000')) {
      return res.status(402).json({ error: 'Cartão recusado (simulação). Use outro número.' });
    }
    await activatePaidEvent(event, payment, 'CREDIT_CARD');
    return res.json({ paymentId: payment.id, method: 'card', status: 'paid', eventStatus: event.status, mock: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/credit (organizador) — ativa o evento usando o saldo de
// creditos concedido pelo super-admin. So funciona quando o saldo cobre o plano.
async function payWithCredit(req, res, next) {
  try {
    const { eventId, planId } = req.body;
    const event = await Event.findOne({ where: { id: eventId, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const plan = getPlan(planId || event.planId);
    if (!plan) return res.status(400).json({ error: 'Plano invalido.' });
    if (isCustomPlan(plan)) {
      return res.status(400).json({ error: 'Este plano é sob consulta e não pode ser pago com créditos.' });
    }
    if (plan.priceCents === 0) {
      return res.status(400).json({ error: 'Plano gratuito nao requer creditos.' });
    }
    if (event.isPaid && event.status !== EVENT_STATUS.DRAFT) {
      return res.status(400).json({ error: 'Este evento ja esta ativo.' });
    }

    // Recarrega o usuario para pegar o saldo mais recente (evita corrida).
    const result = await sequelize.transaction(async (t) => {
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      const price = plan.priceCents;
      if ((user.creditCents || 0) < price) {
        const err = new Error('Créditos insuficientes para este plano.');
        err.statusCode = 402;
        err.balanceCents = user.creditCents || 0;
        throw err;
      }

      // Fixa o plano no evento e debita o saldo.
      event.planId = plan.id;
      event.maxGuests = plan.maxGuests;
      event.maxPhotos = plan.capacity != null ? plan.capacity : 0;
      user.creditCents = (user.creditCents || 0) - price;
      await user.save({ transaction: t });

      // Registra o pagamento via credito (nao conta como receita de caixa).
      const payment = await Plan.create({
        eventId: event.id,
        planId: plan.id,
        amountCents: price,
        provider: 'credit',
        billingType: 'CREDITO',
        status: 'paid',
        paidAt: new Date(),
      }, { transaction: t });

      event.isPaid = true;
      event.pricePaidCents = price;
      if (event.status === EVENT_STATUS.DRAFT) event.status = EVENT_STATUS.ACTIVE;
      await event.save({ transaction: t });

      return { user, payment };
    });

    return res.json({
      ok: true,
      paidWithCredit: true,
      event: { id: event.id, status: event.status, isPaid: event.isPaid },
      creditCents: result.user.creditCents,
      user: result.user.toJSON(),
    });
  } catch (err) {
    if (err.statusCode === 402) {
      return res.status(402).json({ error: err.message, creditCents: err.balanceCents });
    }
    return next(err);
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

module.exports = { checkout, pixCheckout, cardCheckout, confirmMock, paymentStatus, webhook, activatePaidEvent, payWithCredit };
