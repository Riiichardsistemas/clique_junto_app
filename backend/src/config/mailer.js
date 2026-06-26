/**
 * Mailer com nodemailer.
 * - Se SMTP_HOST estiver configurado, envia de verdade.
 * - Caso contrario, usa transporte "mock" que apenas loga no console
 *   (util para desenvolvimento sem credenciais).
 */
let nodemailer = null;
try {
  // eslint-disable-next-line global-require
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

const FROM = process.env.MAIL_FROM || 'ERA UMA VEZ <no-reply@eraumavez.com>';
const hasSmtp = !!process.env.SMTP_HOST;

let transporter = null;
if (nodemailer && hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendMail({ to, subject, html }) {
  if (transporter) {
    return transporter.sendMail({ from: FROM, to, subject, html });
  }
  // Mock
  console.log(`\n[MAIL:mock] Para: ${to}\n[MAIL:mock] Assunto: ${subject}\n`);
  return { mocked: true };
}

module.exports = { sendMail, FROM, hasSmtp };
