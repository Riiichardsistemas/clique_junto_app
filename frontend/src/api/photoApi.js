import axios from 'axios';
import { getGuestToken } from './guestApi';
import api from './axios';
import { API_BASE_URL } from './config';

const BASE = API_BASE_URL;

function guestHeaders(slug) {
  const token = getGuestToken(slug);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const photoApi = {
  /**
   * Solicita URL de upload para o backend.
   * Returns: { uploadUrl, method, key, storageMode }
   */
  getUploadUrl: (slug, fileName, fileType, mediaType = 'photo') =>
    axios
      .post(
        `${BASE}/photos/upload-url`,
        { fileName, fileType, mediaType },
        { headers: guestHeaders(slug) }
      )
      .then((r) => r.data),

  /** Upload local: PUT binário direto na API */
  localUpload: (key, blob) =>
    axios.put(`${BASE}/photos/storage/${encodeURIComponent(key)}`, blob, {
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    }),

  /** Upload S3: PUT com a URL assinada */
  s3Upload: (uploadUrl, blob) =>
    axios.put(uploadUrl, blob, {
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    }),

  /**
   * Salva metadados após upload.
   * storageKey = chave retornada por getUploadUrl
   */
  savePhoto: (slug, { storageKey, filter, mediaType = 'photo', durationSeconds = null }) =>
    axios
      .post(
        `${BASE}/photos`,
        { storageKey, filter, mediaType, durationSeconds },
        { headers: guestHeaders(slug) }
      )
      .then((r) => r.data),

  /** Lista fotos de um evento pelo ID numérico (público, respeita revelação) */
  listForEvent: (eventId, { limit = 60, offset = 0 } = {}) =>
    axios
      .get(`${BASE}/photos/event/${eventId}`, { params: { limit, offset } })
      .then((r) => r.data),

  /** Remove foto (organizador) — usa instância api com auth header */
  remove: (photoId) => api.delete(`/photos/${photoId}`).then((r) => r.data),
};
