const express = require('express');
const ctrl = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Todas as rotas exigem organizador autenticado E papel de admin
router.use(authMiddleware, adminMiddleware);

router.get('/overview', ctrl.overview);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', ctrl.updateUser);
router.post('/users/:id/credits', ctrl.grantCredit);
router.get('/events', ctrl.listEvents);
router.get('/events/:id', ctrl.getEvent);
router.patch('/events/:id', ctrl.updateEvent);
router.post('/events/:id/branding-image', upload.single('image'), ctrl.uploadEventBranding);
router.post('/events/:id/close', ctrl.closeEvent);
router.post('/events/:id/reveal', ctrl.revealEvent);
router.delete('/events/:id', ctrl.deleteEvent);
router.get('/payments', ctrl.listPayments);
router.get('/payments/:id', ctrl.getPayment);
router.get('/commissions', ctrl.listCommissions);
router.patch('/commissions/:id', ctrl.updateCommission);
router.get('/affiliates', ctrl.listAffiliates);
router.get('/audit-logs', ctrl.listAuditLogs);
router.get('/access-logs', ctrl.listAccessLogs);
router.get('/blocked-ips', ctrl.listBlockedIps);
router.post('/blocked-ips', ctrl.blockIp);
router.delete('/blocked-ips/:id', ctrl.unblockIp);
router.get('/system', ctrl.systemStatus);

module.exports = router;
