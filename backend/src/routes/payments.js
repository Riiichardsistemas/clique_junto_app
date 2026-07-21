const express = require('express');
const ctrl = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const userOnlyMiddleware = require('../middlewares/userOnlyMiddleware');
const { PLANS } = require('../config/plans');

const router = express.Router();

// Tabela de planos (publica, para a pagina de precos)
router.get('/plans', (req, res) => res.json({ plans: PLANS }));

router.post('/checkout', authMiddleware, userOnlyMiddleware, ctrl.checkout);
router.post('/pix', authMiddleware, userOnlyMiddleware, ctrl.pixCheckout);
router.post('/card', authMiddleware, userOnlyMiddleware, ctrl.cardCheckout);
router.post('/confirm', authMiddleware, userOnlyMiddleware, ctrl.confirmMock); // confirma mock (dev)
router.get('/status/:paymentId', authMiddleware, userOnlyMiddleware, ctrl.paymentStatus);

// Webhook do Asaas — precisa do corpo cru (o parse é feito no controller).
// A rota /api/payments/webhook é registrada com express.raw() ANTES do
// express.json() global em app.js (ver app.js), então aqui só encaminha.
router.post('/webhook', ctrl.webhook);

module.exports = router;
