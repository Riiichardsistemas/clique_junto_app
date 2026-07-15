require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

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
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
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

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('[DB] Conexao estabelecida com sucesso.');

    await db.sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('[DB] Models sincronizados.');

    startRevealJob();

    app.listen(PORT, () => {
      console.log(`[API] Servidor rodando em http://localhost:${PORT}`);
      console.log(`[API] Banco: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (dev)'}`);
      console.log(`[API] Storage: ${storage.useS3 ? 'S3' : 'local (/uploads)'}`);
    });
  } catch (err) {
    console.error('[FATAL] Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
