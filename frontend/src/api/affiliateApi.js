import api from './axios';

export const affiliateApi = {
  me: () => api.get('/affiliate/me').then((r) => r.data),
};
