const express = require('express');
const ctrl = require('../controllers/recapController');
const authMiddleware = require('../middlewares/authMiddleware');
const userOnlyMiddleware = require('../middlewares/userOnlyMiddleware');

const router = express.Router();

router.use(authMiddleware, userOnlyMiddleware);
router.post('/generate', ctrl.generate);
router.get('/:eventId/status', ctrl.status);

module.exports = router;
