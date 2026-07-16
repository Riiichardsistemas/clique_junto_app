/**
 * Envio de e-mail com três modos, escolhidos por variável de ambiente:
 *
 *   1. Resend  — se RESEND_API_KEY estiver definida (recomendado, via HTTP API).
 *   2. SMTP    — se SMTP_HOST estiver definido (nodemailer).
 *   3. Mock    — caso contrário, apenas loga no console (desenvolvimento).
 *
 * O remetente vem de MAIL_FROM (ex.: "Clique Junto <no-reply@seudominio.com>").
 * No Resend, o domínio do remetente precisa estar verificado.
 */

const FROM = process.env.MAIL_FROM || 'CLIQUE JUNTO <no-reply@cliquejunto.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const hasSmtp = !!process.env.SMTP_HOST;
const hasResend = !!RESEND_API_KEY;

// --- Resend (HTTP) ---
async function sendViaResend({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Resend HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

// --- SMTP (nodemailer, lazy) ---
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  let nodemailer;
  try {
    // eslint-disable-next-line global-require
    nodemailer = require('nodemailer');
  } catch (e) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  try {
    if (hasResend) {
      return await sendViaResend({ to, subject, html });
    }
    if (hasSmtp) {
      const t = getTransporter();
      if (t) return await t.sendMail({ from: FROM, to, subject, html });
    }
  } catch (err) {
    console.error(`[MAIL] falha ao enviar para ${to}:`, err.message);
    return { error: err.message };
  }
  // Mock
  console.log(`\n[MAIL:mock] Para: ${to}\n[MAIL:mock] Assunto: ${subject}\n`);
  return { mocked: true };
}

module.exports = { sendMail, FROM, hasSmtp, hasResend };
