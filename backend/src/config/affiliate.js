/**
 * Configuracao do programa de afiliados.
 *
 * DEFAULT_RATE_BPS: comissao padrao em "basis points" (2000 = 20%).
 * Pode ser sobrescrita pela variavel de ambiente AFFILIATE_RATE_BPS.
 */
const DEFAULT_RATE_BPS = (() => {
  const fromEnv = Number(process.env.AFFILIATE_RATE_BPS);
  if (Number.isFinite(fromEnv) && fromEnv > 0 && fromEnv <= 10000) return Math.round(fromEnv);
  return 2000; // 20%
})();

// Calcula a comissao (em centavos) a partir do valor da venda e da taxa.
function commissionFor(amountCents, rateBps = DEFAULT_RATE_BPS) {
  const cents = Math.round((Number(amountCents) || 0) * (Number(rateBps) || 0) / 10000);
  return Math.max(0, cents);
}

// Formata basis points como percentual legivel (2000 -> "20%").
function formatRate(rateBps = DEFAULT_RATE_BPS) {
  const pct = (Number(rateBps) || 0) / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

module.exports = { DEFAULT_RATE_BPS, commissionFor, formatRate };
