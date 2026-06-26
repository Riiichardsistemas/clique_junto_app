const multer = require('multer');
const { ALLOWED_MIME, MAX_FILE_BYTES } = require('../config/constants');

/**
 * Upload em memoria (buffer) para o endpoint de storage local.
 * Em producao com S3, o cliente envia direto via presigned URL e este
 * middleware nao e usado.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de arquivo nao permitido.'));
  },
});

// Aceita tambem PUT com corpo binario cru (sem multipart)
function rawBody(req, res, next) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    req.rawBuffer = Buffer.concat(chunks);
    next();
  });
  req.on('error', next);
}

module.exports = { upload, rawBody };
