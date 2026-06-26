const express = require('express');
const ctrl = require('../controllers/recapController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/generate', ctrl.generate);
router.get('/:eventId/status', ctrl.status);

module.exports = router;
