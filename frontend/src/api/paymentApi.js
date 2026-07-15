import api from './axios';

export const paymentApi = {
  // Tabela de planos (pública)
  plans: () => api.get('/payments/plans').then((r) => r.data),

  // Cria a cobrança (página hospedada) e devolve { free, provider, checkoutUrl, paymentId, ... }
  checkout: (eventId, planId, extra = {}) =>
    api.post('/payments/checkout', { eventId, planId, ...extra }).then((r) => r.data),

  // Pix no app: devolve { paymentId, pix: { encodedImage, payload }, amountCents }
  pix: (eventId, planId, extra = {}) =>
    api.post('/payments/pix', { eventId, planId, ...extra }).then((r) => r.data),

  // Cartão no app: devolve { paymentId, status } (paid | pending)
  card: (eventId, planId, payload) =>
    api.post('/payments/card', { eventId, planId, ...payload }).then((r) => r.data),

  // Consulta status de uma cobrança { status, eventStatus, isPaid, invoiceUrl }
  status: (paymentId) =>
    api.get(`/payments/status/${paymentId}`).then((r) => r.data),

  // Confirma pagamento simulado (apenas modo mock/dev)
  confirmMock: (paymentId) =>
    api.post('/payments/confirm', { paymentId }).then((r) => r.data),
};
