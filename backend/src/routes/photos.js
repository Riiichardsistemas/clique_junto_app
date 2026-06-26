const express = require('express');
const ctrl = require('../controllers/photoController');
const guestMiddleware = require('../middlewares/guestMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const { rawBody } = require('../middlewares/uploadMiddleware');
const { uploadLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Convidado
router.post('/upload-url', uploadLimiter, guestMiddleware, ctrl.getUploadUrl);
router.post('/', uploadLimiter, guestMiddleware, ctrl.create);

// Upload local (recebe bytes crus). Sem multipart; corpo binario.
router.put('/storage/:key', express.raw({ type: '*/*', limit: '20mb' }), (req, res, next) => {
  req.rawBuffer = req.body && req.body.length ? req.body : null;
  next();
}, ctrl.localStorageUpload);

// Publico (respeita revelacao)
router.get('/event/:eventId', ctrl.listForEvent);

// Organizador
router.get('/event/:eventId/download', authMiddleware, ctrl.downloadZip);
router.delete('/:id', authMiddleware, ctrl.remove);

module.exports = router;
