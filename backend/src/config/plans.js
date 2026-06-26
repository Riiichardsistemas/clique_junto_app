/**
 * Definicao dos planos (em BRL). Fonte unica de verdade no backend.
 * O frontend tem uma copia em src/utils/plans.js (mantida em sincronia).
 */
const PLANS = [
  { id: 'free', maxGuests: 5, priceCents: 0, label: '5 participantes' },
  { id: 'p10', maxGuests: 10, priceCents: 990, label: '10 participantes' },
  { id: 'p25', maxGuests: 25, priceCents: 2490, label: '25 participantes' },
  { id: 'p50', maxGuests: 50, priceCents: 4990, label: '50 participantes' },
  { id: 'p100', maxGuests: 100, priceCents: 9990, label: '100 participantes' },
  { id: 'p150', maxGuests: 150, priceCents: 14990, label: '150 participantes' },
  { id: 'p200', maxGuests: 200, priceCents: 19990, label: '200 participantes' },
  { id: 'p200plus', maxGuests: 100000, priceCents: 29990, label: '200+ participantes' },
];

function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null;
}

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

module.exports = { PLANS, getPlan, formatBRL };
