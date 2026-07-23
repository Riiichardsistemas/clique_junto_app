/* Teste isolado do fluxo de afiliados (SQLite temporario). */
process.env.SQLITE_STORAGE = '/tmp/affiliate_test.sqlite';
process.env.JWT_SECRET = 'test-secret-para-rodar-o-teste-local-1234567890';
process.env.NODE_ENV = 'development';
delete process.env.DATABASE_URL;

const fs = require('fs');
try { fs.unlinkSync('/tmp/affiliate_test.sqlite'); } catch (_) {}

const db = require('./src/models');
const { User, Event, Plan } = db;
const { ensureReferralCode, resolveAffiliateByCode, generateCommissionForPayment } = require('./src/services/affiliateService');
const { getMyAffiliate } = require('./src/controllers/affiliateController');
const admin = require('./src/controllers/adminController');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}
const next = (e) => { if (e) { console.error('NEXT ERR', e); throw e; } };

(async () => {
  await db.sequelize.sync({ force: true });

  // 1. Afiliado
  const affiliate = await User.create({ name: 'Ana Afiliada', email: 'ana@x.com', passwordHash: 'x', role: 'user' });
  const code = await ensureReferralCode(affiliate);
  console.log('1) referralCode gerado:', code, '| len', code.length);

  // 2. Resolve por codigo (case-insensitive)
  const resolved = await resolveAffiliateByCode(code.toLowerCase());
  console.log('2) resolveAffiliateByCode ok:', resolved && resolved.id === affiliate.id);

  // 3. Indicado cadastra via ref
  const buyer = await User.create({ name: 'Bruno Comprador', email: 'bruno@x.com', passwordHash: 'x', role: 'user', referredByUserId: affiliate.id });
  await ensureReferralCode(buyer);
  console.log('3) buyer.referredByUserId == affiliate:', buyer.referredByUserId === affiliate.id);

  // 4. Evento + pagamento pago -> comissao
  const event = await Event.create({ userId: buyer.id, name: 'Festa do Bruno', slug: 'festa-bruno-abc', type: 'festa', planId: 'celebracao' });
  const payment = await Plan.create({ eventId: event.id, planId: 'celebracao', amountCents: 8990, provider: 'asaas', status: 'paid', paidAt: new Date() });
  const c1 = await generateCommissionForPayment(event, payment);
  console.log('4) comissao gerada:', c1 && c1.commissionCents, '(esperado 1798 = 20% de 8990)');

  // 5. Idempotencia
  const c2 = await generateCommissionForPayment(event, payment);
  console.log('5) idempotente (mesmo id):', c2 && c2.id === c1.id);

  // 6. Pagamento via credito NAO gera comissao
  const ev2 = await Event.create({ userId: buyer.id, name: 'Ev2', slug: 'ev2-xyz', type: 'festa', planId: 'essencial' });
  const payCredit = await Plan.create({ eventId: ev2.id, planId: 'essencial', amountCents: 4990, provider: 'credit', status: 'paid', paidAt: new Date() });
  const c3 = await generateCommissionForPayment(ev2, payCredit);
  console.log('6) credito nao gera comissao:', c3 === null);

  // 7. Painel do afiliado
  const res7 = mockRes();
  await getMyAffiliate({ user: affiliate }, res7, next);
  console.log('7) painel afiliado:', JSON.stringify({
    link: res7.body.referralLink,
    rate: res7.body.rateLabel,
    referralCount: res7.body.stats.referralCount,
    pending: res7.body.stats.pending,
    total: res7.body.stats.total,
    commissions: res7.body.commissions.length,
    maskedEmail: res7.body.referrals[0]?.email,
  }, null, 2));

  // 8. Admin: listar comissoes
  const res8 = mockRes();
  await admin.listCommissions({ query: {} }, res8, next);
  console.log('8) admin listCommissions total:', res8.body.total, '| pending summary:', res8.body.summary.pending);

  // 9. Admin: marcar como paga
  const res9 = mockRes();
  await admin.updateCommission({ params: { id: c1.id }, body: { status: 'paid', note: 'Pix enviado' }, user: affiliate }, res9, next);
  console.log('9) admin marcou paga:', res9.body.commission.status, res9.body.commission.paidAt ? 'com data' : 'SEM data');

  // 10. Admin: ranking de afiliados
  const res10 = mockRes();
  await admin.listAffiliates({ query: {} }, res10, next);
  console.log('10) admin listAffiliates:', JSON.stringify(res10.body.affiliates.map(a => ({ name: a.name, refs: a.referralCount, paid: a.paid, pending: a.pending })), null, 2));

  await db.sequelize.close();
  console.log('\nTODOS OS TESTES EXECUTARAM.');
})().catch((e) => { console.error('FALHA:', e); process.exit(1); });
