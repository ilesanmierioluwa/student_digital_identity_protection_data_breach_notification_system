const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BreachIncident', default: null },
    type: { type: String, enum: ['BREACH_ALERT', 'SECURITY_ALERT', 'INFO'], default: 'BREACH_ALERT' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
