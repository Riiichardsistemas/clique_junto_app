/**
 * Fonte unica da URL base da API.
 *
 * Motivo: se VITE_API_URL for configurada sem protocolo (ex.:
 * "meu-backend.up.railway.app/api"), o axios trata o valor como caminho
 * RELATIVO e envia o POST para o proprio dominio do frontend
 * (https://app.exemplo.com.br/meu-backend.up.railway.app/api/...).
 * A Vercel serve apenas arquivos estaticos e responde 405 Method Not Allowed.
 *
 * Esta funcao normaliza o valor para sempre virar uma URL absoluta terminada
 * em /api, independente de como a variavel foi preenchida no painel.
 */

const DEFAULT_API_URL = 'http://localhost:4000/api';

export function normalizeApiBaseUrl(rawValue) {
  const value = String(rawValue ?? '').trim();

  if (!value) return DEFAULT_API_URL;

  // Garante protocolo absoluto. Sem isso o axios monta uma URL relativa.
  let withProtocol = value;
  if (!/^https?:\/\//i.test(withProtocol)) {
    // Remove "//" ou "/" iniciais antes de aplicar o protocolo.
    const hostAndPath = withProtocol.replace(/^\/+/, '');
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(hostAndPath);
    withProtocol = `${isLocal ? 'http' : 'https'}://${hostAndPath}`;
  }

  let url;
  try {
    url = new URL(withProtocol);
  } catch (_error) {
    console.error('[API] VITE_API_URL invalida:', rawValue, '- usando fallback local.');
    return DEFAULT_API_URL;
  }

  // Normaliza o path: sem barra final e com /api garantido.
  const path = url.pathname.replace(/\/+$/, '');
  const normalizedPath = /\/api$/i.test(path) ? path : `${path}/api`;

  return `${url.origin}${normalizedPath}`;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

// Aviso em producao quando a variavel nao foi configurada na Vercel.
if (import.meta.env.PROD && API_BASE_URL.includes('localhost')) {
  console.error(
    '[API] VITE_API_URL nao configurada no ambiente de producao. ' +
      'Defina-a na Vercel como https://SEU-BACKEND.up.railway.app/api e refaca o deploy.'
  );
}

export default API_BASE_URL;
