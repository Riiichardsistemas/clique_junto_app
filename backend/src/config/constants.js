// Constantes compartilhadas

const EVENT_TYPES = ['casamento', 'festa', 'aniversario', 'corporativo', 'viagem', 'outro'];

const EVENT_STATUS = {
  DRAFT: 'draft', // criado, aguardando ativacao/pagamento
  ACTIVE: 'active', // aceitando fotos
  CLOSED: 'closed', // encerrado, nao aceita fotos, ainda nao revelado
  REVEALED: 'revealed', // fotos visiveis
};

const FILTERS = ['nenhum', 'vintage', 'polaroid', 'pb', 'cinema', 'kodak'];

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Videos curtos (max 15s, gravados no navegador)
const ALLOWED_VIDEO_MIME = ['video/webm', 'video/mp4', 'video/quicktime'];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB (foto)
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40MB (video de ate 15s)
const MAX_VIDEO_SECONDS = 15;

module.exports = {
  EVENT_TYPES, EVENT_STATUS, FILTERS,
  ALLOWED_MIME, ALLOWED_VIDEO_MIME,
  MAX_FILE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS,
};
