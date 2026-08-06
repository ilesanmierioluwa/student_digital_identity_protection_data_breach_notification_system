const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceInfo: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    refreshTokenHash: { type: String, default: null },
    lastActiveAt: { type: Date, default: Date.now },
    isRevoked: { type: Boolean, default: false },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
