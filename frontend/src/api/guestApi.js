import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const GUEST_TOKEN_PREFIX = 'euv_guest_';

export function getGuestToken(slug) {
  return sessionStorage.getItem(GUEST_TOKEN_PREFIX + slug);
}

export function setGuestToken(slug, token) {
  if (token) sessionStorage.setItem(GUEST_TOKEN_PREFIX + slug, token);
  else sessionStorage.removeItem(GUEST_TOKEN_PREFIX + slug);
}

function guestHeaders(slug) {
  const token = getGuestToken(slug);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const guestApi = {
  getEvent: (slug) =>
    axios.get(`${BASE}/guests/event/${slug}`).then((r) => r.data),

  join: (slug, nickname) =>
    axios.post(`${BASE}/guests/join`, { slug, nickname }).then((r) => r.data),

  me: (slug) =>
    axios
      .get(`${BASE}/guests/me`, { headers: guestHeaders(slug) })
      .then((r) => r.data),
};
