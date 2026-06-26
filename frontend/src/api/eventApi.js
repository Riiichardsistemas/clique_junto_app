import api from './axios';

export const eventApi = {
  list: () => api.get('/events').then((r) => r.data),
  create: (data) => api.post('/events', data).then((r) => r.data),
  getOne: (id) => api.get(`/events/${id}`).then((r) => r.data),
  update: (id, data) => api.put(`/events/${id}`, data).then((r) => r.data),
  close: (id) => api.post(`/events/${id}/close`).then((r) => r.data),
  reveal: (id) => api.post(`/events/${id}/reveal`).then((r) => r.data),
  listGuests: (id) => api.get(`/events/${id}/guests`).then((r) => r.data),
  banGuest: (id, guestId, banned) =>
    api.post(`/events/${id}/guests/${guestId}/ban`, { banned }).then((r) => r.data),
  qrCodeUrl: (id) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    return `${base}/events/${id}/qrcode`;
  },
  tableSignUrl: (id) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    return `${base}/events/${id}/table-sign`;
  },
};
