const express = require('express');
const authRoutes = require('./auth');
const eventRoutes = require('./events');
const guestRoutes = require('./guests');
const photoRoutes = require('./photos');
const paymentRoutes = require('./payments');
const recapRoutes = require('./recap');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'era-uma-vez-api', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/guests', guestRoutes);
router.use('/photos', photoRoutes);
router.use('/payments', paymentRoutes);
router.use('/recap', recapRoutes);

module.exports = router;
