import api from './axios';
import { API_BASE_URL } from './config';

export const eventApi = {
  list: () => api.get('/events').then((r) => r.data),
  create: (data) => api.post('/events', data).then((r) => r.data),
  getOne: (id) => api.get(`/events/${id}`).then((r) => r.data),
  update: (id, data) => api.put(`/events/${id}`, data).then((r) => r.data),
  uploadBrandingImage: (id, slot, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/events/${id}/branding-image?slot=${slot}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  delete: (id) => api.delete(`/events/${id}`).then((r) => r.data),
  close: (id) => api.post(`/events/${id}/close`).then((r) => r.data),
  reveal: (id) => api.post(`/events/${id}/reveal`).then((r) => r.data),
  publish: (id) => api.post(`/events/${id}/publish`).then((r) => r.data),
  listGuests: (id) => api.get(`/events/${id}/guests`).then((r) => r.data),
  banGuest: (id, guestId, banned = true) =>
    api.post(`/events/${id}/guests/${guestId}/ban`, { banned }).then((r) => r.data),
  // Fotos do evento (organizador, sem restrição de revelação)
  listPhotos: (id, { limit = 60, offset = 0 } = {}) =>
    api.get(`/photos/event/${id}/admin`, { params: { limit, offset } }).then((r) => r.data),
  // ZIP de todas as fotos (organizador) — modo local
  downloadZip: (id) =>
    api.get(`/photos/event/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
  qrCodeUrl: (id) => `${API_BASE_URL}/events/${id}/qrcode`,
  tableSignUrl: (id) => `${API_BASE_URL}/events/${id}/table-sign`,
};
