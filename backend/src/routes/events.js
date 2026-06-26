const express = require('express');
const ctrl = require('../controllers/eventController');
const { getQRCode, getTableSign } = require('../controllers/qrController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas de evento exigem organizador autenticado
router.use(authMiddleware);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/close', ctrl.close);
router.post('/:id/reveal', ctrl.reveal);
router.post('/:id/publish', ctrl.publish);

router.get('/:id/guests', ctrl.listGuests);
router.post('/:id/guests/:guestId/ban', ctrl.banGuest);

// QR Code
router.get('/:id/qrcode', getQRCode); // PNG
router.get('/:id/table-sign', getTableSign); // SVG para impressao

module.exports = router;
