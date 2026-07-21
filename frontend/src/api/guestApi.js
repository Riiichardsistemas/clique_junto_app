import axios from 'axios';
import { API_BASE_URL } from './config';

const BASE = API_BASE_URL;

const GUEST_TOKEN_PREFIX = 'euv_guest_';

// localStorage: convidado que fecha a aba não perde a sessão (nem "gasta"
// outra vaga do evento ao voltar). Migra tokens antigos do sessionStorage.
export function getGuestToken(slug) {
  const key = GUEST_TOKEN_PREFIX + slug;
  let token = localStorage.getItem(key);
  if (!token) {
    token = sessionStorage.getItem(key);
    if (token) { localStorage.setItem(key, token); sessionStorage.removeItem(key); }
  }
  return token;
}

export function setGuestToken(slug, token) {
  const key = GUEST_TOKEN_PREFIX + slug;
  if (token) localStorage.setItem(key, token);
  else { localStorage.removeItem(key); sessionStorage.removeItem(key); }
}

function guestHeaders(slug) {
  const token = getGuestToken(slug);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const guestApi = {
  // Helpers de token expostos no objeto (usados pelas páginas do convidado)
  getGuestToken,
  setGuestToken,

  getEvent: (slug) =>
    axios.get(`${BASE}/guests/event/${slug}`).then((r) => r.data),

  join: (slug, nickname, email) =>
    axios.post(`${BASE}/guests/join`, { slug, nickname, email }).then((r) => r.data),

  me: (slug) =>
    axios
      .get(`${BASE}/guests/me`, { headers: guestHeaders(slug) })
      .then((r) => r.data),

  // Telão (link secreto, sem login)
  slideshow: (key) =>
    axios.get(`${BASE}/guests/slideshow/${key}`).then((r) => r.data),
};
