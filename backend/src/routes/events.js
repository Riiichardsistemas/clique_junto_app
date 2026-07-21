const express = require('express');
const ctrl = require('../controllers/eventController');
const { getQRCode, getTableSign } = require('../controllers/qrController');
const authMiddleware = require('../middlewares/authMiddleware');
const userOnlyMiddleware = require('../middlewares/userOnlyMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Todas as rotas de evento exigem organizador autenticado
router.use(authMiddleware, userOnlyMiddleware);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.destroy);
router.post('/:id/close', ctrl.close);
router.post('/:id/reveal', ctrl.reveal);
router.post('/:id/publish', ctrl.publish);

router.get('/:id/guests', ctrl.listGuests);
router.post('/:id/guests/:guestId/ban', ctrl.banGuest);

// QR Code
router.post('/:id/branding-image', upload.single('image'), ctrl.uploadBrandingImage);

router.get('/:id/qrcode', getQRCode); // PNG
router.get('/:id/table-sign', getTableSign); // SVG para impressao

module.exports = router;
