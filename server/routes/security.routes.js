const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMyAuditLog,
  listAuditLogs,
  exportAuditLogsCsv,
  getAuditSummary,
  listBreachIncidents,
  createBreachIncident,
  getBreachIncident,
  updateBreachIncidentStatus,
  listAnomalyFlags,
  markAnomalyFlagReviewed,
  getSecurityDashboard,
  getSecurityConfig,
  updateSecurityConfig,
  forceLogoutUser,
  forcePasswordReset,
} = require('../controllers/securityController');

router.use(protect);

router.get('/my-log', getMyAuditLog);

router.get('/summary', authorize('admin'), getAuditSummary);
router.get('/logs', authorize('admin'), listAuditLogs);
router.get('/logs/export', authorize('admin'), exportAuditLogsCsv);

router.get('/dashboard', authorize('admin'), getSecurityDashboard);
router.get('/config', authorize('admin'), getSecurityConfig);
router.put('/config', authorize('admin'), updateSecurityConfig);

router.get('/incidents', authorize('admin'), listBreachIncidents);
router.post('/incidents', authorize('admin'), createBreachIncident);
router.get('/incidents/:id', authorize('admin'), getBreachIncident);
router.put('/incidents/:id/status', authorize('admin'), updateBreachIncidentStatus);

router.get('/anomalies', authorize('admin'), listAnomalyFlags);
router.put('/anomalies/:id/reviewed', authorize('admin'), markAnomalyFlagReviewed);

router.post('/users/:id/force-logout', authorize('admin'), forceLogoutUser);
router.post('/users/:id/force-password-reset', authorize('admin'), forcePasswordReset);

module.exports = router;
