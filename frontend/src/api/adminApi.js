import api from './axios';

export const adminApi = {
  overview: () => api.get('/admin/overview').then((r) => r.data),
  users: (params = {}) => api.get('/admin/users', { params }).then((r) => r.data),
  user: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  events: (params = {}) => api.get('/admin/events', { params }).then((r) => r.data),
  event: (id) => api.get(`/admin/events/${id}`).then((r) => r.data),
  closeEvent: (id) => api.post(`/admin/events/${id}/close`).then((r) => r.data),
  revealEvent: (id) => api.post(`/admin/events/${id}/reveal`).then((r) => r.data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`).then((r) => r.data),
  payments: (params = {}) => api.get('/admin/payments', { params }).then((r) => r.data),
  auditLogs: (params = {}) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
  system: () => api.get('/admin/system').then((r) => r.data),
};
