// Planos visiveis no seletor (em sincronia com backend/src/config/plans.js).
// capacity = capacidade sugerida de memorias (fotos/videos). 0 = ilimitado.
// priceCents = null => "Sob consulta" (plano personalizado).
// maxInstallments = máximo de parcelas no cartão de crédito (1 = à vista).
export const PLANS = [
  { id: 'free',          maxGuests: 5,      capacity: 50,   priceCents: 0,     label: 'Grátis',        maxInstallments: 1 },
  { id: 'essencial',     maxGuests: 10,     capacity: 100,  priceCents: 4990,  label: 'Essencial',     maxInstallments: 1 },
  { id: 'celebracao',    maxGuests: 50,     capacity: 500,  priceCents: 8990,  label: 'Celebração',    maxInstallments: 1 },
  { id: 'especial',      maxGuests: 100,    capacity: 1000, priceCents: 15900, label: 'Especial',      maxInstallments: 3 },
  { id: 'grande',        maxGuests: 200,    capacity: 2000, priceCents: 29900, label: 'Grande Evento', maxInstallments: 3 },
  { id: 'personalizado', maxGuests: 100000, capacity: 0,    priceCents: null,  label: 'Personalizado', custom: true, maxInstallments: 1 },
];

// Planos antigos — mantidos apenas para resolver rotulos de eventos ja criados.
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

export function getPlan(id) {
  return ALL_PLANS.find((p) => p.id === id) || null;
}

export function isCustomPlan(plan) {
  return !!(plan && (plan.custom || plan.priceCents == null));
}

export function formatBRL(cents) {
  if (cents == null) return 'Sob consulta';
  if (cents === 0) return 'Grátis';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Texto amigavel da capacidade sugerida de memorias.
export function capacityLabel(capacity) {
  if (!capacity) return 'Memórias ilimitadas';
  return `Até ${capacity.toLocaleString('pt-BR')} memórias`;
}
