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
      'User-Agent': 'CliqueJunto',
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
  const wantDigits = String(cpfCnpj || '').replace(/\D/g, '');

  // Tenta localizar por email
  const found = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (found?.data?.length) {
    const existing = found.data[0];
    // Cliente pode ter sido criado antes SEM CPF/CNPJ (ou com outro). Atualiza
    // via PUT para garantir que a cobranca nao falhe por falta do documento.
    const currentDigits = String(existing.cpfCnpj || '').replace(/\D/g, '');
    if (wantDigits && currentDigits !== wantDigits) {
      try {
        await asaasFetch(`/customers/${existing.id}`, {
          method: 'PUT',
          body: { cpfCnpj: wantDigits },
        });
      } catch (e) { /* segue com o cliente existente */ }
    }
    return existing.id;
  }

  const created = await asaasFetch('/customers', {
    method: 'POST',
    body: { name, email, cpfCnpj: wantDigits || undefined },
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

/**
 * Cria uma cobrança PIX e retorna a cobrança + o QR Code (imagem base64 e copia-e-cola).
 */
async function createPixCharge({ customerId, amountCents, description, externalReference }) {
  const dueDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType: 'PIX',
      value: Number((amountCents / 100).toFixed(2)),
      dueDate,
      description,
      externalReference,
    },
  });
  let qr = {};
  try {
    qr = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
  } catch (e) { qr = {}; }
  return {
    id: payment.id,
    status: payment.status,
    invoiceUrl: payment.invoiceUrl,
    pix: {
      encodedImage: qr.encodedImage || null, // PNG base64 (sem prefixo data:)
      payload: qr.payload || null,           // copia-e-cola
      expirationDate: qr.expirationDate || null,
    },
  };
}

/**
 * Cria uma cobrança no CARTÃO DE CRÉDITO (cobrança imediata).
 * card = { holderName, number, expiryMonth, expiryYear, ccv }
 * holderInfo = { name, email, cpfCnpj, postalCode, addressNumber, phone }
 */
async function createCardCharge({ customerId, amountCents, description, externalReference, card, holderInfo, remoteIp, installments }) {
  const dueDate = new Date().toISOString().slice(0, 10);
  const total = Number((amountCents / 100).toFixed(2));
  const parcels = Math.max(1, Number(installments) || 1);
  // À vista (1x) usa 'value'. Parcelado (2x+) usa installmentCount + totalValue,
  // conforme a API do Asaas (a última parcela absorve o arredondamento).
  const amountFields = parcels >= 2
    ? { installmentCount: parcels, totalValue: total }
    : { value: total };
  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      ...amountFields,
      dueDate,
      description,
      externalReference,
      creditCard: {
        holderName: card.holderName,
        number: String(card.number || '').replace(/\s+/g, ''),
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        ccv: card.ccv,
      },
      creditCardHolderInfo: {
        name: holderInfo.name,
        email: holderInfo.email,
        cpfCnpj: holderInfo.cpfCnpj,
        postalCode: holderInfo.postalCode,
        addressNumber: holderInfo.addressNumber,
        phone: holderInfo.phone,
      },
      remoteIp: remoteIp || undefined,
    },
  });
  return { id: payment.id, status: payment.status, invoiceUrl: payment.invoiceUrl, billingType: 'CREDIT_CARD' };
}

module.exports = {
  useAsaas,
  ASAAS_ENV,
  BASE_URL,
  ensureCustomer,
  createPayment,
  createPixCharge,
  createCardCharge,
  getPayment,
};
