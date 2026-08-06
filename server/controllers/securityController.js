const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Session = require('../models/Session');
const BreachIncident = require('../models/BreachIncident');
const AnomalyFlag = require('../models/AnomalyFlag');
const SecurityConfig = require('../models/SecurityConfig');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { queueIncidentNotifications } = require('../services/notificationService');
const { writeAuditLog } = require('../middleware/auditLogger');
const logger = require('../utils/logger');

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

const getMyAuditLog = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = { targetUserId: req.user._id };

    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorUserId', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: { logs, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = {};

    if (req.query.actorUserId) filter.actorUserId = req.query.actorUserId;
    if (req.query.targetUserId) filter.targetUserId = req.query.targetUserId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorUserId', 'fullName email role')
        .populate('targetUserId', 'fullName email matricNumber role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: { logs, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const exportAuditLogsCsv = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.actorUserId) filter.actorUserId = req.query.actorUserId;
    if (req.query.targetUserId) filter.targetUserId = req.query.targetUserId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const logs = await AuditLog.find(filter)
      .populate('actorUserId', 'fullName email role')
      .populate('targetUserId', 'fullName email matricNumber role')
      .sort({ createdAt: -1 })
      .lean();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'EXPORT_RECORD',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'AUDIT_LOG_CSV_EXPORT', recordCount: logs.length },
    });

    const escape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = ['timestamp', 'action', 'actor', 'actorRole', 'target', 'ipAddress', 'userAgent', 'metadata'];
    const rows = logs.map((l) =>
      [
        l.createdAt?.toISOString(),
        l.action,
        l.actorUserId?.fullName || '',
        l.actorRole || '',
        l.targetUserId?.fullName || '',
        l.ipAddress || '',
        l.userAgent || '',
        JSON.stringify(l.metadata || {}),
      ]
        .map(escape)
        .join(',')
    );

    const csv = [header.map(escape).join(','), ...rows].join('\n');
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

const getAuditSummary = async (req, res, next) => {
  try {
    const [total, loginSuccess, loginFailure, views, exports, deactivations] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ action: 'LOGIN_SUCCESS' }),
      AuditLog.countDocuments({ action: 'LOGIN_FAILURE' }),
      AuditLog.countDocuments({ action: 'VIEW_RECORD' }),
      AuditLog.countDocuments({ action: 'EXPORT_RECORD' }),
      AuditLog.countDocuments({ action: 'ACCOUNT_DEACTIVATED' }),
    ]);
    res.json({
      success: true,
      data: { total, loginSuccess, loginFailure, views, exports, deactivations },
    });
  } catch (err) {
    next(err);
  }
};

const listBreachIncidents = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;

    const [incidents, total] = await Promise.all([
      BreachIncident.find(filter)
        .populate('affectedUserIds', 'fullName email matricNumber role')
        .populate('resolvedBy', 'fullName email')
        .sort({ detectedAt: -1 })
        .skip(skip)
        .limit(take),
      BreachIncident.countDocuments(filter),
    ]);

    res.json({ success: true, data: { incidents, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const createBreachIncident = async (req, res, next) => {
  try {
    const { title, description, severity, affectedEmails } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    let affectedUserIds = [];
    if (Array.isArray(affectedEmails) && affectedEmails.length > 0) {
      const users = await User.find({ email: { $in: affectedEmails.map((e) => String(e).toLowerCase()) }, role: 'student' }).select('_id email');
      affectedUserIds = users.map((u) => u._id);
    }

    const incident = await BreachIncident.create({
      title,
      description,
      severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium',
      detectionMethod: 'manual',
      affectedUserIds,
      status: 'open',
    });

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'BREACH_INCIDENT_CREATED_MANUAL', incidentId: incident._id, affectedCount: affectedUserIds.length },
    });

    queueIncidentNotifications(incident._id);

    res.status(201).json({
      success: true,
      message: `Breach incident created and associated with ${affectedUserIds.length} affected student(s). Notification pipeline started.`,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
};

const getBreachIncident = async (req, res, next) => {
  try {
    const incident = await BreachIncident.findById(req.params.id)
      .populate('affectedUserIds', 'fullName email matricNumber role')
      .populate('resolvedBy', 'fullName email')
      .populate('deliveryStatus.userId', 'fullName email matricNumber role');
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    next(err);
  }
};

const updateBreachIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'investigating', 'contained', 'notified', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const incident = await BreachIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    incident.status = status;
    if (status === 'resolved') {
      incident.resolvedAt = new Date();
      incident.resolvedBy = req.user._id;
    } else {
      incident.resolvedAt = null;
      incident.resolvedBy = null;
    }

    await incident.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'BREACH_INCIDENT_STATUS_UPDATED', incidentId: incident._id, status },
    });

    res.json({ success: true, message: `Incident status updated to "${status}"`, data: incident });
  } catch (err) {
    next(err);
  }
};

const listAnomalyFlags = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.reviewed === 'true') filter.reviewed = true;
    if (req.query.reviewed === 'false') filter.reviewed = false;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.userId) filter.userId = req.query.userId;

    const [flags, total] = await Promise.all([
      AnomalyFlag.find(filter)
        .populate('userId', 'fullName email matricNumber role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      AnomalyFlag.countDocuments(filter),
    ]);

    res.json({ success: true, data: { flags, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const markAnomalyFlagReviewed = async (req, res, next) => {
  try {
    const flag = await AnomalyFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Flag not found' });

    flag.reviewed = true;
    await flag.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'ANOMALY_FLAG_REVIEWED', flagId: flag._id, type: flag.type },
    });

    res.json({ success: true, message: 'Anomaly flag marked as reviewed', data: flag });
  } catch (err) {
    next(err);
  }
};

const getSecurityDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [openIncidents, totalIncidents, unreviewedAnomalies, totalAnomalies, activeSessions, failedLogins24h, loginSuccess24h, anomalyByType, incidentBySeverity, failedLoginHeatmap] =
      await Promise.all([
        BreachIncident.countDocuments({ status: { $ne: 'resolved' } }),
        BreachIncident.countDocuments(),
        AnomalyFlag.countDocuments({ reviewed: false }),
        AnomalyFlag.countDocuments(),
        Session.countDocuments({ isRevoked: false }),
        AuditLog.countDocuments({ action: 'LOGIN_FAILURE', createdAt: { $gte: dayAgo } }),
        AuditLog.countDocuments({ action: 'LOGIN_SUCCESS', createdAt: { $gte: dayAgo } }),
        AnomalyFlag.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
        BreachIncident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
        AuditLog.aggregate([
          { $match: { action: 'LOGIN_FAILURE', createdAt: { $gte: dayAgo } } },
          { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        ]),
      ]);

    const heatmap = Array.from({ length: 24 }, (_, h) => {
      const row = failedLoginHeatmap.find((r) => r._id === h);
      return { hour: h, count: row ? row.count : 0 };
    });

    const reduce = (arr) => Object.fromEntries(arr.map((r) => [r._id, r.count]));

    res.json({
      success: true,
      data: {
        openIncidents,
        totalIncidents,
        unreviewedAnomalies,
        totalAnomalies,
        activeSessions,
        failedLogins24h,
        loginSuccess24h,
        anomalyByType: reduce(anomalyByType),
        incidentBySeverity: reduce(incidentBySeverity),
        failedLoginHeatmap: heatmap,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSecurityConfig = async (req, res, next) => {
  try {
    const config = await SecurityConfig.getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

const updateSecurityConfig = async (req, res, next) => {
  try {
    const allowedKeys = [
      'failedLoginLimit',
      'lockoutDurationMinutes',
      'anomalyEscalationThreshold',
      'bulkAccessThreshold',
      'bulkAccessWindowMinutes',
      'offHoursStart',
      'offHoursEnd',
      'impossibleTravelKmThreshold',
      'impossibleTravelMinutesWindow',
      'scanIntervalMinutes',
    ];

    const update = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        const num = Number(req.body[key]);
        if (Number.isNaN(num) || num < 0) {
          return res.status(400).json({ success: false, message: `${key} must be a non-negative number` });
        }
        update[key] = num;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings provided' });
    }

    update.updatedBy = req.user._id;
    const config = await SecurityConfig.findOneAndUpdate({ key: 'default' }, { $set: update }, { new: true, upsert: true });

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'SECURITY_CONFIG_UPDATED', changes: update },
    });

    res.json({ success: true, message: 'Security configuration updated', data: config });
  } catch (err) {
    next(err);
  }
};

const forceLogoutUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const result = await Session.updateMany(
      { userId: target._id, isRevoked: false },
      { $set: { isRevoked: true, revokedReason: 'admin_force_logout' } }
    );

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      targetUserId: target._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'FORCE_LOGOUT', revokedSessions: result.modifiedCount },
    });

    res.json({ success: true, message: `Logged out ${target.fullName} from all sessions (${result.modifiedCount} revoked)` });
  } catch (err) {
    next(err);
  }
};

const forcePasswordReset = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const tempPassword = `Dspz@${crypto.randomBytes(4).toString('hex')}`;
    target.passwordHash = await bcrypt.hash(tempPassword, 12);
    target.mustChangePassword = true;
    await target.save();

    await Session.updateMany(
      { userId: target._id, isRevoked: false },
      { $set: { isRevoked: true, revokedReason: 'admin_force_password_reset' } }
    );

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'PASSWORD_CHANGE',
      targetUserId: target._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'FORCE_PASSWORD_RESET', forcedBy: req.user._id },
    });

    res.json({
      success: true,
      message: `Password reset for ${target.fullName}. They must change it on next sign-in.`,
      data: { tempPassword },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
