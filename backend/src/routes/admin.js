const express = require('express');
const ctrl = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

// Todas as rotas exigem organizador autenticado E papel de admin
router.use(authMiddleware, adminMiddleware);

router.get('/overview', ctrl.overview);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', ctrl.updateUser);
router.get('/events', ctrl.listEvents);
router.get('/events/:id', ctrl.getEvent);
router.post('/events/:id/close', ctrl.closeEvent);
router.post('/events/:id/reveal', ctrl.revealEvent);
router.delete('/events/:id', ctrl.deleteEvent);
router.get('/payments', ctrl.listPayments);
router.get('/audit-logs', ctrl.listAuditLogs);
router.get('/system', ctrl.systemStatus);

module.exports = router;
