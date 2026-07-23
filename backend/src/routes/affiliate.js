const express = require('express');
const ctrl = require('../controllers/affiliateController');
const authMiddleware = require('../middlewares/authMiddleware');
const userOnlyMiddleware = require('../middlewares/userOnlyMiddleware');

const router = express.Router();

// Painel do afiliado (organizador autenticado).
router.get('/me', authMiddleware, userOnlyMiddleware, ctrl.getMyAffiliate);

module.exports = router;
