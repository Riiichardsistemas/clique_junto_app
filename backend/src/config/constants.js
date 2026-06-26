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

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

module.exports = { EVENT_TYPES, EVENT_STATUS, FILTERS, ALLOWED_MIME, MAX_FILE_BYTES };
