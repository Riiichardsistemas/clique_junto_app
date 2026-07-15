import api from './axios';

export const paymentApi = {
  // Tabela de planos (pública)
  plans: () => api.get('/payments/plans').then((r) => r.data),

  // Cria a cobrança e devolve { free, provider, checkoutUrl, paymentId, ... }
  checkout: (eventId, planId, extra = {}) =>
    api.post('/payments/checkout', { eventId, planId, ...extra }).then((r) => r.data),

  // Consulta status de uma cobrança { status, eventStatus, isPaid, invoiceUrl }
  status: (paymentId) =>
    api.get(`/payments/status/${paymentId}`).then((r) => r.data),

  // Confirma pagamento simulado (apenas modo mock/dev)
  confirmMock: (paymentId) =>
    api.post('/payments/confirm', { paymentId }).then((r) => r.data),
};
