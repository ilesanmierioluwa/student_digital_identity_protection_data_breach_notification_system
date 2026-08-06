const mongoose = require('mongoose');

const anomalyFlagSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: [
        'MULTIPLE_FAILED_LOGINS',
        'LOGIN_NEW_LOCATION',
        'IMPOSSIBLE_TRAVEL',
        'BULK_EXPORT_ATTEMPT',
        'OFF_HOURS_ACCESS',
        'REFRESH_TOKEN_REUSE',
      ],
      required: true,
    },
    score: { type: Number, required: true, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

anomalyFlagSchema.index({ userId: 1, createdAt: -1 });
anomalyFlagSchema.index({ reviewed: 1, createdAt: -1 });

module.exports = mongoose.model('AnomalyFlag', anomalyFlagSchema);
