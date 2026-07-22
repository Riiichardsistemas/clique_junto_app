const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Abstracao de armazenamento.
 *
 * - DEV (padrao): armazenamento LOCAL em backend/uploads.
 *   O "presigned URL" de upload aponta para o proprio backend
 *   (PUT /api/photos/storage/:key) e a leitura e via /uploads/... (estatico).
 *
 * - PRODUCAO: se AWS_BUCKET_NAME estiver definido, usa S3 com presigned URLs
 *   reais (requer os pacotes @aws-sdk/client-s3 e @aws-sdk/s3-request-presigner).
 */

// Aceita tanto os nomes AWS_* quanto os aliases R2_* (Cloudflare R2).
const BUCKET = process.env.AWS_BUCKET_NAME || process.env.R2_BUCKET || '';
const useS3 = !!BUCKET;
const defaultUploadsDir = path.join(__dirname, '..', '..', 'uploads');
const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || defaultUploadsDir
);

if (!useS3 && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sanitizeName(name) {
  return String(name || 'foto')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-60);
}

function buildKey(eventId, fileName) {
  const rand = crypto.randomBytes(8).toString('hex');
  const ext = (path.extname(fileName || '') || '.jpg').toLowerCase();
  return `events/${eventId}/${Date.now()}-${rand}${ext}`;
}

// --- S3 / Cloudflare R2 (lazy) ---
// R2 e compativel com S3, mas exige um endpoint proprio
// (https://<accountid>.r2.cloudflarestorage.com) e region 'auto'.
let _s3;
function getS3() {
  if (_s3) return _s3;
  // eslint-disable-next-line global-require
  const { S3Client } = require('@aws-sdk/client-s3');
  // Endpoint: aceita S3_ENDPOINT ou R2_ENDPOINT; se so houver R2_ACCOUNT_ID, monta a URL do R2.
  const endpoint = process.env.S3_ENDPOINT
    || process.env.R2_ENDPOINT
    || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  _s3 = new S3Client({
    // R2 usa a regiao 'auto'. Se um endpoint foi informado e AWS_REGION esta vazio,
    // assume 'auto' automaticamente.
    region: process.env.AWS_REGION || (endpoint ? 'auto' : undefined),
    endpoint,
    // R2 aceita virtual-hosted por padrao; permite forcar path-style se necessario.
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _s3;
}

const storage = {
  useS3,
  uploadsDir: UPLOADS_DIR,

  buildKey,
  sanitizeName,

  /**
   * Retorna { uploadUrl, method, key } para o cliente enviar o arquivo.
   */
  async getUploadUrl({ eventId, fileName, fileType, appUrl }) {
    const key = buildKey(eventId, sanitizeName(fileName));

    if (useS3) {
      // eslint-disable-next-line global-require
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      // eslint-disable-next-line global-require
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: fileType,
      });
      const uploadUrl = await getSignedUrl(getS3(), cmd, { expiresIn: 15 * 60 });
      return { uploadUrl, method: 'PUT', key };
    }

    // Local: o cliente faz PUT para o nosso backend
    const base = (appUrl || process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
    return {
      uploadUrl: `${base}/api/photos/storage/${encodeURIComponent(key)}`,
      method: 'PUT',
      key,
    };
  },

  /**
   * Salva um objeto (buffer) no storage e retorna { key, url } para leitura.
   * Funciona tanto em S3 quanto local. Usado para imagens de branding.
   */
  async saveObject({ eventId, fileName, buffer, contentType, appUrl }) {
    const key = buildKey(eventId, sanitizeName(fileName));
    if (useS3) {
      // eslint-disable-next-line global-require
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      await getS3().send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
    } else {
      const dest = path.join(UPLOADS_DIR, key);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, buffer);
    }
    const url = await this.getReadUrl(key, { appUrl });
    return { key, url };
  },

  /**
   * Salva bytes localmente (usado pelo endpoint de upload local).
   */
  async saveLocal(key, buffer) {
    const dest = path.join(UPLOADS_DIR, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, buffer);
    return dest;
  },

  /**
   * URL publica/assinada para leitura (apos revelacao).
   */
  async getReadUrl(key, { appUrl } = {}) {
    if (useS3) {
      // eslint-disable-next-line global-require
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      // eslint-disable-next-line global-require
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
      return getSignedUrl(getS3(), cmd, { expiresIn: 24 * 60 * 60 });
    }
    const base = (appUrl || process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${base}/uploads/${key}`;
  },

  /** Caminho absoluto local (para ZIP/recap). Apenas modo local. */
  localPath(key) {
    return path.join(UPLOADS_DIR, key);
  },

  async remove(key) {
    if (useS3) {
      // eslint-disable-next-line global-require
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3().send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
      );
      return;
    }
    const p = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(p)) await fs.promises.unlink(p);
  },
};

module.exports = storage;
