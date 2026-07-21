require('dotenv').config();

const express = require('express');
const cors = require('cors');

const isProduction = process.env.NODE_ENV === 'production';
const railwayPublicDomain = String(process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();

// Railway fornece o dominio sem protocolo. Esta URL e usada em links de upload.
if (!process.env.APP_URL && railwayPublicDomain) {
  process.env.APP_URL = `https://${railwayPublicDomain}`;
}

function validateProductionConfig() {
  if (!isProduction) return;

  const errors = new Set();
  const weakValues = new Set([
    'troque-este-segredo-em-producao',
    'troque-este-segredo-de-convidado',
    'change-me',
  ]);
  const jwtSecret = String(process.env.JWT_SECRET || '');
  const guestJwtSecret = String(process.env.GUEST_JWT_SECRET || '');
  const frontendOrigins = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  function isSecurePublicUrl(value) {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    } catch (_error) {
      return false;
    }
  }

  try {
    const databaseProtocol = new URL(process.env.DATABASE_URL || '').protocol;
    if (!['postgres:', 'postgresql:'].includes(databaseProtocol)) errors.add('DATABASE_URL');
  } catch (_error) {
    errors.add('DATABASE_URL');
  }

  if (!frontendOrigins.length || frontendOrigins.some((value) => !isSecurePublicUrl(value))) {
    errors.add('FRONTEND_URL');
  }

  if (!process.env.APP_URL || !isSecurePublicUrl(process.env.APP_URL)) errors.add('APP_URL');
  if (jwtSecret.length < 32 || weakValues.has(jwtSecret)) errors.add('JWT_SECRET');
  if (guestJwtSecret.length < 32 || weakValues.has(guestJwtSecret) || guestJwtSecret === jwtSecret) {
    errors.add('GUEST_JWT_SECRET');
  }

  if (errors.size) {
    throw new Error(
      `Variaveis obrigatorias ausentes, invalidas ou inseguras: ${[...errors].join(', ')}`
    );
  }
}

validateProductionConfig();

const db = require('./models');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimitMiddleware');
const { startRevealJob } = require('./jobs/revealJob');
const storage = require('./config/storage');

const app = express();

// Railway/Vercel ficam atras de proxy — necessario para rate-limit e IPs corretos
app.set('trust proxy', 1);

// CORS - aceita requisicoes do frontend
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requisicoes sem Origin incluem health checks, webhooks e clientes servidor-servidor.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);

// O webhook do Asaas precisa do corpo CRU (Buffer) para o parse manual.
// Registrado ANTES do express.json para que o JSON global nao consuma o corpo.
app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Arquivos enviados (modo local de storage)
if (!storage.useS3) {
  app.use('/uploads', express.static(storage.uploadsDir));
}

// Rate limit geral
app.use('/api', apiLimiter);

// Rotas da API
app.use('/api', routes);

// 404 e tratamento de erros
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
let server;

async function shutdown(signal) {
  console.log(`[API] ${signal} recebido. Encerrando com seguranca...`);

  const forceShutdown = setTimeout(() => {
    console.error('[FATAL] Tempo limite de encerramento excedido.');
    process.exit(1);
  }, 10000);
  forceShutdown.unref();

  if (server) {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }

  await db.sequelize.close();
  clearTimeout(forceShutdown);
  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM').catch((error) => {
  console.error('[FATAL] Falha durante o encerramento:', error);
  process.exit(1);
}));

process.once('SIGINT', () => shutdown('SIGINT').catch((error) => {
  console.error('[FATAL] Falha durante o encerramento:', error);
  process.exit(1);
}));

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('[DB] Conexao estabelecida com sucesso.');

    const shouldAlterSchema = !isProduction && process.env.DATABASE_SYNC_ALTER !== 'false';
    await db.sequelize.sync({ alter: shouldAlterSchema });
    console.log('[DB] Models sincronizados.');

    startRevealJob();

    server = await new Promise((resolve, reject) => {
      const instance = app.listen(PORT, HOST, () => resolve(instance));
      instance.once('error', reject);
    });

    const publicUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log(`[API] Servidor rodando em ${publicUrl}`);
    console.log(`[API] Banco: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (dev)'}`);
    console.log(`[API] Storage: ${storage.useS3 ? 'S3' : `local (${storage.uploadsDir})`}`);

    if (isProduction && !storage.useS3 && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
      console.warn('[STORAGE] AVISO: uploads locais nao persistirao sem S3 ou Volume Railway.');
    }
  } catch (err) {
    console.error('[FATAL] Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
