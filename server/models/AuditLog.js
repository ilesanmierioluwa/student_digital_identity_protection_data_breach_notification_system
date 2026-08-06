const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: ['student', 'officer', 'admin'], default: null },
    action: {
      type: String,
      enum: [
        'VIEW_RECORD',
        'EXPORT_RECORD',
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'ROLE_CHANGE',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'DOCUMENT_UPLOAD',
        'ADMIN_ACTION',
        'SESSION_REVOKED',
        'REFRESH_TOKEN_REUSED',
        'BREACH_INCIDENT_CREATED',
        'PROFILE_UPDATE',
        'ACCOUNT_DEACTIVATED',
        'PROFILE_VERIFIED',
        'PROFILE_CHANGE_REVIEWED',
        'CSV_IMPORT',
      ],
      required: true,
      index: true,
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorUserId: 1, timestamp: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
