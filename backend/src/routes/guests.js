const express = require('express');
const ctrl = require('../controllers/guestController');
const guestMiddleware = require('../middlewares/guestMiddleware');

const router = express.Router();

router.get('/event/:slug', ctrl.getEventBySlug); // info publica
router.get('/slideshow/:key', ctrl.slideshow); // telao (link secreto, sem login)
router.post('/join', ctrl.join); // entra e recebe token
router.get('/me', guestMiddleware, ctrl.me); // estado da sessao

module.exports = router;
