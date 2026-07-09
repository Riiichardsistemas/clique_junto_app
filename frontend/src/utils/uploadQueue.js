import { photoApi } from '../api/photoApi';

/**
 * Fila de upload persistente (IndexedDB).
 *
 * Fotos/vídeos entram na fila e são enviados em background com retry
 * automático — essencial em festas com Wi-Fi/4G instável. A mídia fica
 * guardada no dispositivo até o envio ser confirmado pelo servidor.
 */

const DB_NAME = 'euv-upload-queue';
const STORE = 'queue';
const RETRY_INTERVAL_MS = 20000;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
  });
}

async function dbPut(item) {
  const db = await openDb();
  await tx(db, 'readwrite', (s) => s.put(item));
}

async function dbAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbRemove(id) {
  const db = await openDb();
  await tx(db, 'readwrite', (s) => s.delete(id));
}

// ---- Estado / listeners ----

const listeners = new Set();
let processing = false;
let retryTimer = null;

export function subscribeQueue(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(state) {
  listeners.forEach((cb) => { try { cb(state); } catch { /* noop */ } });
}

async function emitStatus(extra = {}) {
  const items = await dbAll().catch(() => []);
  notify({ pending: items.length, sending: processing, ...extra });
}

// ---- API pública ----

/** Adiciona mídia à fila e dispara o envio. */
export async function enqueueUpload({ slug, blob, fileName, fileType, mediaType, filter, durationSeconds }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug, blob, fileName, fileType,
    mediaType: mediaType || 'photo',
    filter: filter || 'nenhum',
    durationSeconds: durationSeconds || null,
    attempts: 0,
    createdAt: Date.now(),
  };
  await dbPut(item);
  await emitStatus();
  processQueue();
  return item.id;
}

export async function pendingUploads(slug) {
  const items = await dbAll().catch(() => []);
  return slug ? items.filter((i) => i.slug === slug) : items;
}

/** Processa a fila. Erros de rede mantêm o item; erros 4xx descartam. */
export async function processQueue() {
  if (processing) return;
  processing = true;
  await emitStatus();

  try {
    const items = (await dbAll()).sort((a, b) => a.createdAt - b.createdAt);
    for (const item of items) {
      try {
        const { uploadUrl, key, storageMode } = await photoApi.getUploadUrl(
          item.slug, item.fileName, item.fileType, item.mediaType
        );
        if (storageMode === 's3') {
          await photoApi.s3Upload(uploadUrl, item.blob);
        } else {
          await photoApi.localUpload(key, item.blob);
        }
        await photoApi.savePhoto(item.slug, {
          storageKey: key,
          filter: item.filter,
          mediaType: item.mediaType,
          durationSeconds: item.durationSeconds,
        });
        await dbRemove(item.id);
        await emitStatus({ uploaded: item });
      } catch (err) {
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) {
          // Rejeitado pelo servidor (limite atingido, evento fechado...) — descarta
          await dbRemove(item.id);
          await emitStatus({ rejected: item, error: err?.response?.data?.error });
        } else {
          // Sem rede / erro de servidor: mantém na fila e tenta depois
          item.attempts += 1;
          await dbPut(item);
          break; // para o loop; retry agendado cuida do resto
        }
      }
    }
  } finally {
    processing = false;
    await emitStatus();
    scheduleRetryIfNeeded();
  }
}

async function scheduleRetryIfNeeded() {
  const items = await dbAll().catch(() => []);
  if (items.length > 0 && !retryTimer) {
    retryTimer = setTimeout(() => { retryTimer = null; processQueue(); }, RETRY_INTERVAL_MS);
  }
}

// Reenvia assim que a conexão voltar
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue());
}
