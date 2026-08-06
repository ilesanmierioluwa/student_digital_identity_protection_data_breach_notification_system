const AnomalyFlag = require('../models/AnomalyFlag');
const BreachIncident = require('../models/BreachIncident');
const AuditLog = require('../models/AuditLog');
const Session = require('../models/Session');
const User = require('../models/User');
const SecurityConfig = require('../models/SecurityConfig');
const geoLookup = require('./geoLookup');
const { writeAuditLog } = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { queueIncidentNotifications } = require('./notificationService');

const FLAG_DEDUPE_MINUTES = 30;
const NEW_LOCATION_MIN_KM = 100;
const NEW_LOCATION_SCORE = 15;
const OFF_HOURS_SCORE = 25;
const IMPOSSIBLE_TRAVEL_SCORE = 60;
const BULK_EXPORT_SCORE = 55;
const MULTIPLE_FAILED_LOGINS_SCORE = 50;

const createFlag = async ({ userId, type, score, details = {} }) => {
  const since = new Date(Date.now() - FLAG_DEDUPE_MINUTES * 60 * 1000);
  const ipQuery = details.ipAddress
    ? { 'details.ipAddress': details.ipAddress }
    : { $or: [{ 'details.ipAddress': { $exists: false } }, { 'details.ipAddress': null }] };
  const existing = await AnomalyFlag.findOne({
    userId,
    type,
    ...ipQuery,
    createdAt: { $gte: since },
  });
  if (existing) return existing;

  const flag = await AnomalyFlag.create({ userId, type, score, details });
  logger.warn(`[ANOMALY] ${type} flag (score ${score}) raised for user ${userId}`);
  await maybeEscalate(flag);
  return flag;
};

const maybeEscalate = async (flag) => {
  try {
    const cfg = await SecurityConfig.getThresholds();
    if (flag.score < cfg.anomalyEscalationThreshold) return null;

    const existing = await BreachIncident.findOne({
      detectionMethod: 'rule_engine',
      affectedUserIds: flag.userId,
      status: { $ne: 'resolved' },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (existing) return existing;

    const user = await User.findById(flag.userId);
    const severity = flag.score >= 80 ? 'critical' : flag.score >= 60 ? 'high' : 'medium';

    const incident = await BreachIncident.create({
      title: `Rule-engine detected anomaly: ${flag.type.replace(/_/g, ' ').toLowerCase()}`,
      description:
        `The anomaly engine automatically raised a breach incident for ` +
        `${user ? user.fullName : 'user ' + flag.userId} after flagging ${flag.type} ` +
        `with a risk score of ${flag.score}. Detection details: ${JSON.stringify(flag.details)}.`,
      severity,
      detectionMethod: 'rule_engine',
      affectedUserIds: [flag.userId],
      status: 'open',
    });

    logger.error(`[ANOMALY] Escalated ${flag.type} (score ${flag.score}) -> BreachIncident ${incident._id}`);
    writeAuditLog({
      actorUserId: flag.userId,
      actorRole: user ? user.role : 'unknown',
      action: 'ADMIN_ACTION',
      targetUserId: flag.userId,
      ipAddress: flag.details.ipAddress || '',
      userAgent: flag.details.userAgent || '',
      metadata: {
        operation: 'BREACH_INCIDENT_AUTO_ESCALATED',
        incidentId: incident._id,
        flagType: flag.type,
        score: flag.score,
      },
    });
    queueIncidentNotifications(incident._id);
    return incident;
  } catch (err) {
    logger.error(`[ANOMALY] Escalation failed: ${err.message}`);
    return null;
  }
};

const evaluateLoginAnomalies = async ({ userId, ipAddress, userAgent, eventTime = new Date() }) => {
  try {
    const cfg = await SecurityConfig.getThresholds();
    const loc = geoLookup.lookup(ipAddress);
    const results = [];

    const hour = eventTime.getUTCHours();
    const offHours =
      (cfg.offHoursStart < cfg.offHoursEnd && hour >= cfg.offHoursStart && hour < cfg.offHoursEnd) ||
      (cfg.offHoursStart > cfg.offHoursEnd && (hour >= cfg.offHoursStart || hour < cfg.offHoursEnd));

    if (offHours) {
      const flag = await createFlag({
        userId,
        type: 'OFF_HOURS_ACCESS',
        score: OFF_HOURS_SCORE,
        details: {
          ipAddress,
          userAgent,
          hour,
          location: loc,
          note: `Login at ${String(hour).padStart(2, '0')}:00 UTC falls within institutional off-hours`,
        },
      });
      results.push(flag);
    }

    const previous = await Session.find({
      userId,
      isRevoked: false,
      lastActiveAt: { $ne: null },
    })
      .sort({ lastActiveAt: -1 })
      .limit(2)
      .lean();

    const prevSession = previous[1] || null;

    if (prevSession && prevSession.ipAddress && prevSession.ipAddress !== ipAddress) {
      const prevLoc = geoLookup.lookup(prevSession.ipAddress);
      const distanceKm = geoLookup.haversineKm(loc, prevLoc);
      const minutesSince = (eventTime - new Date(prevSession.lastActiveAt)) / 60000;

      if (distanceKm >= cfg.impossibleTravelKmThreshold && minutesSince <= cfg.impossibleTravelMinutesWindow) {
        const flag = await createFlag({
          userId,
          type: 'IMPOSSIBLE_TRAVEL',
          score: IMPOSSIBLE_TRAVEL_SCORE,
          details: {
            ipAddress,
            userAgent,
            fromIp: prevSession.ipAddress,
            fromLocation: prevLoc,
            toLocation: loc,
            distanceKm: Math.round(distanceKm),
            minutesSince: Math.round(minutesSince),
          },
        });
        results.push(flag);
      } else if (distanceKm >= NEW_LOCATION_MIN_KM) {
        const flag = await createFlag({
          userId,
          type: 'LOGIN_NEW_LOCATION',
          score: NEW_LOCATION_SCORE,
          details: {
            ipAddress,
            userAgent,
            fromIp: prevSession.ipAddress,
            fromLocation: prevLoc,
            toLocation: loc,
            distanceKm: Math.round(distanceKm),
          },
        });
        results.push(flag);
      }
    }

    return results;
  } catch (err) {
    logger.error(`[ANOMALY] evaluateLoginAnomalies failed: ${err.message}`);
    return [];
  }
};

const checkBulkExport = async (officerUserId) => {
  try {
    const cfg = await SecurityConfig.getThresholds();
    const since = new Date(Date.now() - cfg.bulkAccessWindowMinutes * 60 * 1000);
    const count = await AuditLog.countDocuments({
      actorUserId: officerUserId,
      action: 'VIEW_RECORD',
      createdAt: { $gte: since },
    });
    if (count >= cfg.bulkAccessThreshold) {
      const flag = await createFlag({
        userId: officerUserId,
        type: 'BULK_EXPORT_ATTEMPT',
        score: BULK_EXPORT_SCORE,
        details: {
          recordCount: count,
          windowMinutes: cfg.bulkAccessWindowMinutes,
          threshold: cfg.bulkAccessThreshold,
        },
      });
      return flag;
    }
    return null;
  } catch (err) {
    logger.error(`[ANOMALY] checkBulkExport failed: ${err.message}`);
    return null;
  }
};

const recordMultipleFailedLogins = async ({ userId, failedAttempts, ipAddress, userAgent }) => {
  return createFlag({
    userId,
    type: 'MULTIPLE_FAILED_LOGINS',
    score: MULTIPLE_FAILED_LOGINS_SCORE,
    details: { failedAttempts, ipAddress, userAgent },
  });
};

module.exports = {
  createFlag,
  maybeEscalate,
  evaluateLoginAnomalies,
  checkBulkExport,
  recordMultipleFailedLogins,
  SCORES: {
    OFF_HOURS: OFF_HOURS_SCORE,
    IMPOSSIBLE_TRAVEL: IMPOSSIBLE_TRAVEL_SCORE,
    NEW_LOCATION: NEW_LOCATION_SCORE,
    BULK_EXPORT: BULK_EXPORT_SCORE,
    MULTIPLE_FAILED_LOGINS: MULTIPLE_FAILED_LOGINS_SCORE,
  },
};
