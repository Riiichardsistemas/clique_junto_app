const express = require('express');
const ctrl = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { PLANS } = require('../config/plans');

const router = express.Router();

// Tabela de planos (publica, para a pagina de precos)
router.get('/plans', (req, res) => res.json({ plans: PLANS }));

router.post('/checkout', authMiddleware, ctrl.checkout);
router.post('/confirm', authMiddleware, ctrl.confirmMock); // confirma mock
router.post('/webhook', express.raw({ type: '*/*' }), ctrl.webhook); // stub

module.exports = router;
