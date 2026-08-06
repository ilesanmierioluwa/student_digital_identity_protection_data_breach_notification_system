const mongoose = require('mongoose');

const deliveryStatusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { _id: false }
);

const breachIncidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, default: 'medium' },
    detectionMethod: {
      type: String,
      enum: ['manual', 'rule_engine', 'rate_limit_trigger', 'token_reuse'],
      default: 'manual',
    },
    affectedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['open', 'investigating', 'contained', 'notified', 'resolved'],
      default: 'open',
      index: true,
    },
    detectedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notificationsSentAt: { type: Date, default: null },
    deliveryStatus: { type: [deliveryStatusSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BreachIncident', breachIncidentSchema);
