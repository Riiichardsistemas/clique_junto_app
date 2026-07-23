const { DataTypes } = require('sequelize');

/**
 * Comissao de afiliado.
 *
 * Gerada quando um usuario indicado (referredByUserId) paga por um evento.
 * O afiliado (affiliateUserId) ganha uma porcentagem (rateBps) do valor pago.
 *
 * - rateBps: taxa em "basis points" (2000 = 20%).
 * - commissionCents: valor da comissao em centavos (amountCents * rateBps / 10000).
 * - status:
 *     pending   -> gerada, aguardando repasse ao afiliado
 *     paid      -> ja repassada pelo super-admin (Pix/transferencia)
 *     canceled  -> cancelada (ex.: estorno da venda)
 * - paymentId: id do registro Plan (cobranca) que originou a comissao.
 *   Unico: garante 1 comissao por cobranca (idempotencia).
 */
module.exports = (sequelize) => {
  const Commission = sequelize.define(
    'Commission',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      // Afiliado que recebe a comissao (dono do link de indicacao)
      affiliateUserId: { type: DataTypes.UUID, allowNull: false },
      // Usuario indicado que efetuou a compra
      referredUserId: { type: DataTypes.UUID, allowNull: false },
      // Evento comprado
      eventId: { type: DataTypes.UUID, allowNull: true },
      // Cobranca (Plan) que originou a comissao — unica por comissao
      paymentId: { type: DataTypes.UUID, allowNull: true, unique: true },
      // Valor da venda que serviu de base para o calculo
      saleAmountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Taxa aplicada (basis points): 2000 = 20%
      rateBps: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2000 },
      // Valor da comissao em centavos
      commissionCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'canceled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Data em que o super-admin marcou como paga
      paidAt: { type: DataTypes.DATE, allowNull: true },
      // Observacao livre do super-admin (ex.: comprovante do Pix)
      note: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'commissions', timestamps: true }
  );

  return Commission;
};
