/**
 * Definicao dos planos (em BRL). Fonte unica de verdade no backend.
 * O frontend tem uma copia em src/utils/plans.js (mantida em sincronia).
 *
 * Campos:
 *  - id          identificador estavel usado no banco (event.planId)
 *  - maxGuests   limite de convidados (participantes) do evento
 *  - capacity    capacidade sugerida de memorias (fotos/videos) do album. 0 = ilimitado
 *  - priceCents  preco em centavos. 0 = gratuito. null = sob consulta (personalizado)
 *  - label       nome comercial exibido ao usuario
 *  - custom      true para o plano "sob consulta" (nao entra no checkout automatico)
 */
const PLANS = [
  { id: 'free',          maxGuests: 5,      capacity: 50,   priceCents: 0,     label: 'Grátis' },
  { id: 'essencial',     maxGuests: 10,     capacity: 100,  priceCents: 4990,  label: 'Essencial' },
  { id: 'celebracao',    maxGuests: 50,     capacity: 500,  priceCents: 8990,  label: 'Celebração' },
  { id: 'especial',      maxGuests: 100,    capacity: 1000, priceCents: 15900, label: 'Especial' },
  { id: 'grande',        maxGuests: 200,    capacity: 2000, priceCents: 29900, label: 'Grande Evento' },
  { id: 'personalizado', maxGuests: 100000, capacity: 0,    priceCents: null,  label: 'Personalizado', custom: true },
];

/**
 * Planos antigos, mantidos apenas para que eventos ja criados continuem
 * resolvendo o rotulo/limites corretos. Nao aparecem no seletor.
 */
const LEGACY_PLANS = [
  { id: 'p10',      maxGuests: 10,     capacity: 100,  priceCents: 990,   label: '10 participantes', legacy: true },
  { id: 'p25',      maxGuests: 25,     capacity: 250,  priceCents: 2490,  label: '25 participantes', legacy: true },
  { id: 'p50',      maxGuests: 50,     capacity: 500,  priceCents: 4990,  label: '50 participantes', legacy: true },
  { id: 'p100',     maxGuests: 100,    capacity: 1000, priceCents: 9990,  label: '100 participantes', legacy: true },
  { id: 'p150',     maxGuests: 150,    capacity: 1500, priceCents: 14990, label: '150 participantes', legacy: true },
  { id: 'p200',     maxGuests: 200,    capacity: 2000, priceCents: 19990, label: '200 participantes', legacy: true },
  { id: 'p200plus', maxGuests: 100000, capacity: 0,    priceCents: 29990, label: '200+ participantes', legacy: true },
];

const ALL_PLANS = [...PLANS, ...LEGACY_PLANS];

function getPlan(id) {
  return ALL_PLANS.find((p) => p.id === id) || null;
}

// Plano "sob consulta" (personalizado) — nao pode ser cobrado automaticamente.
function isCustomPlan(plan) {
  return !!(plan && (plan.custom || plan.priceCents == null));
}

function formatBRL(cents) {
  if (cents == null) return 'Sob consulta';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

module.exports = { PLANS, LEGACY_PLANS, ALL_PLANS, getPlan, isCustomPlan, formatBRL };
