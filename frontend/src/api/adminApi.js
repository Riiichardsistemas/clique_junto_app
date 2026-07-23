import api from './axios';

export const adminApi = {
  overview: () => api.get('/admin/overview').then((r) => r.data),
  users: (params = {}) => api.get('/admin/users', { params }).then((r) => r.data),
  user: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  grantCredit: (id, data) => api.post(`/admin/users/${id}/credits`, data).then((r) => r.data),
  events: (params = {}) => api.get('/admin/events', { params }).then((r) => r.data),
  event: (id) => api.get(`/admin/events/${id}`).then((r) => r.data),
  updateEvent: (id, data) => api.patch(`/admin/events/${id}`, data).then((r) => r.data),
  uploadEventBranding: (id, slot, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/admin/events/${id}/branding-image?slot=${slot}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  closeEvent: (id) => api.post(`/admin/events/${id}/close`).then((r) => r.data),
  revealEvent: (id) => api.post(`/admin/events/${id}/reveal`).then((r) => r.data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`).then((r) => r.data),
  payments: (params = {}) => api.get('/admin/payments', { params }).then((r) => r.data),
  payment: (id) => api.get(`/admin/payments/${id}`).then((r) => r.data),
  commissions: (params = {}) => api.get('/admin/commissions', { params }).then((r) => r.data),
  updateCommission: (id, data) => api.patch(`/admin/commissions/${id}`, data).then((r) => r.data),
  affiliates: (params = {}) => api.get('/admin/affiliates', { params }).then((r) => r.data),
  auditLogs: (params = {}) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
  accessLogs: (params = {}) => api.get('/admin/access-logs', { params }).then((r) => r.data),
  blockedIps: () => api.get('/admin/blocked-ips').then((r) => r.data),
  blockIp: (data) => api.post('/admin/blocked-ips', data).then((r) => r.data),
  unblockIp: (id) => api.delete(`/admin/blocked-ips/${id}`).then((r) => r.data),
  system: () => api.get('/admin/system').then((r) => r.data),
};
