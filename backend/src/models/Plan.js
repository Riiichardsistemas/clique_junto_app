const { DataTypes } = require('sequelize');

/**
 * Registro de transacao/checkout de um plano para um evento.
 * (Os planos em si sao estaticos em config/plans.js. Este model guarda o
 *  historico de pagamento — util para o webhook e para auditoria.)
 */
module.exports = (sequelize) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      eventId: { type: DataTypes.UUID, allowNull: false },
      planId: { type: DataTypes.STRING, allowNull: false },
      amountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      provider: {
        type: DataTypes.ENUM('mock', 'stripe', 'pagarme', 'asaas'),
        allowNull: false,
        defaultValue: 'mock',
      },
      providerSessionId: { type: DataTypes.STRING, allowNull: true },
      // Id da cobranca no provedor (ex.: pay_xxx no Asaas)
      providerPaymentId: { type: DataTypes.STRING, allowNull: true },
      // Link do checkout hospedado (Pix/boleto/cartao)
      invoiceUrl: { type: DataTypes.STRING, allowNull: true },
      // Metodo efetivamente usado (PIX, BOLETO, CREDIT_CARD...)
      billingType: { type: DataTypes.STRING, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    { tableName: 'plans', timestamps: true }
  );

  return Plan;
};
