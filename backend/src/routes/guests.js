const express = require('express');
const ctrl = require('../controllers/guestController');
const guestMiddleware = require('../middlewares/guestMiddleware');

const router = express.Router();

router.get('/event/:slug', ctrl.getEventBySlug); // info publica
router.post('/join', ctrl.join); // entra e recebe token
router.get('/me', guestMiddleware, ctrl.me); // estado da sessao

module.exports = router;
