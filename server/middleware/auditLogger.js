const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const writeAuditLog = async ({ actorUserId, actorRole, action, targetUserId, ipAddress, userAgent, metadata = {} }) => {
  try {
    await AuditLog.create({
      actorUserId,
      actorRole,
      action,
      targetUserId,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (err) {
    logger.error('Failed to write audit log', { error: err.message, action });
  }
};

const auditLogger =
  ({ action, getMetadata = () => ({}) }) =>
  async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      originalJson(body);
      if (body && body.success === false) return;
      writeAuditLog({
        actorUserId: req.user?._id,
        actorRole: req.user?.role,
        action,
        targetUserId: req.params?.id || req.params?.userId || req.body?.targetUserId || null,
        ipAddress: req.clientIp,
        userAgent: req.userAgent || req.headers['user-agent'] || '',
        metadata: getMetadata(req),
      });
    };
    next();
  };

module.exports = { writeAuditLog, auditLogger };
