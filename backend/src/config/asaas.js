/**
 * Integração com o Asaas (gateway de pagamento brasileiro).
 * Pix, boleto e cartão via checkout hospedado (invoiceUrl).
 *
 * - Se ASAAS_API_KEY estiver definida, usa a API real (sandbox ou produção,
 *   conforme ASAAS_ENV).
 * - Sem chave: MODO MOCK — simula a criação da cobrança para desenvolvimento,
 *   retornando uma URL interna de checkout simulado.
 *
 * Docs: https://docs.asaas.com/
 */

const API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = (process.env.ASAAS_ENV || 'sandbox').toLowerCase();
const useAsaas = !!API_KEY;

const BASE_URL = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

async function asaasFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY,
      'User-Agent': 'EraUmaVez',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || `Asaas HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.asaas = data;
    throw err;
  }
  return data;
}

/**
 * Garante um cliente no Asaas para o organizador (reaproveita pelo email).
 * Retorna o id do customer.
 */
async function ensureCustomer({ name, email, cpfCnpj }) {
  // Tenta localizar por email
  const found = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (found?.data?.length) return found.data[0].id;

  const created = await asaasFetch('/customers', {
    method: 'POST',
    body: { name, email, cpfCnpj: cpfCnpj || undefined },
  });
  return created.id;
}

/**
 * Cria uma cobrança avulsa e retorna { id, invoiceUrl, status }.
 * billingType UNDEFINED deixa o cliente escolher Pix/boleto/cartão na página.
 *
 * @param {Object} p
 * @param {string} p.customerId
 * @param {number} p.amountCents
 * @param {string} p.description
 * @param {string} p.externalReference  id do nosso registro de pagamento (Plan)
 */
async function createPayment({ customerId, amountCents, description, externalReference }) {
  const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10); // vencimento em 3 dias (Pix/cartão pagam na hora)

  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number((amountCents / 100).toFixed(2)),
      dueDate,
      description,
      externalReference,
    },
  });
  return { id: payment.id, invoiceUrl: payment.invoiceUrl, status: payment.status };
}

async function getPayment(id) {
  return asaasFetch(`/payments/${id}`);
}

module.exports = {
  useAsaas,
  ASAAS_ENV,
  BASE_URL,
  ensureCustomer,
  createPayment,
  getPayment,
};
