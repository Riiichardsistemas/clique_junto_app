const { User, Commission } = require('../models');
const { generateUniqueReferralCode } = require('../utils/generateReferralCode');
const { DEFAULT_RATE_BPS, commissionFor } = require('../config/affiliate');

/**
 * Garante que o usuario tenha um referralCode. Gera e salva se ainda nao existir.
 * Retorna o codigo (existente ou recem-criado).
 */
async function ensureReferralCode(user) {
  if (!user) return null;
  if (user.referralCode) return user.referralCode;

  const code = await generateUniqueReferralCode(async (candidate) => {
    const found = await User.findOne({ where: { referralCode: candidate }, attributes: ['id'] });
    return !!found;
  });

  user.referralCode = code;
  try {
    await user.save({ fields: ['referralCode'] });
  } catch (_error) {
    // Corrida rara de unicidade: recarrega e tenta reaproveitar o que foi gravado.
    const fresh = await User.findByPk(user.id, { attributes: ['referralCode'] });
    if (fresh?.referralCode) {
      user.referralCode = fresh.referralCode;
      return fresh.referralCode;
    }
    throw _error;
  }
  return code;
}

/**
 * Resolve o afiliado a partir de um codigo de indicacao (referralCode).
 * Retorna o usuario afiliado ativo, ou null se invalido/inativo.
 */
async function resolveAffiliateByCode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;
  const affiliate = await User.findOne({ where: { referralCode: code } });
  if (!affiliate || !affiliate.isActive) return null;
  return affiliate;
}

/**
 * Gera a comissao de afiliado para uma cobranca paga, se aplicavel.
 *
 * Regras:
 *  - o comprador (event.userId) precisa ter sido indicado (referredByUserId);
 *  - o afiliado precisa existir, estar ativo e ser diferente do comprador;
 *  - nao gera para pagamentos via credito (nao ha entrada de caixa);
 *  - idempotente: 1 comissao por cobranca (paymentId unico).
 *
 * Nunca lanca — uma falha aqui nao deve derrubar a confirmacao do pagamento.
 * Retorna a comissao criada, ou null.
 */
async function generateCommissionForPayment(event, payment) {
  try {
    if (!event || !payment) return null;
    if (payment.provider === 'credit') return null; // credito nao e receita real
    if (!payment.amountCents || payment.amountCents <= 0) return null;

    // Ja existe comissao para esta cobranca?
    const existing = await Commission.findOne({ where: { paymentId: payment.id } });
    if (existing) return existing;

    const buyer = await User.findByPk(event.userId);
    if (!buyer || !buyer.referredByUserId) return null;
    if (buyer.referredByUserId === buyer.id) return null; // auto-indicacao

    const affiliate = await User.findByPk(buyer.referredByUserId);
    if (!affiliate || !affiliate.isActive) return null;

    const rateBps = DEFAULT_RATE_BPS;
    const commissionCents = commissionFor(payment.amountCents, rateBps);
    if (commissionCents <= 0) return null;

    const commission = await Commission.create({
      affiliateUserId: affiliate.id,
      referredUserId: buyer.id,
      eventId: event.id,
      paymentId: payment.id,
      saleAmountCents: payment.amountCents,
      rateBps,
      commissionCents,
      status: 'pending',
    });
    return commission;
  } catch (error) {
    console.error('[affiliate] falha ao gerar comissao:', error.message);
    return null;
  }
}

module.exports = {
  ensureReferralCode,
  resolveAffiliateByCode,
  generateCommissionForPayment,
};
