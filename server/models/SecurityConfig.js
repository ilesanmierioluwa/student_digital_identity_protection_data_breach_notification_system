const mongoose = require('mongoose');

const securityConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    failedLoginLimit: { type: Number, default: 5 },
    lockoutDurationMinutes: { type: Number, default: 15 },
    anomalyEscalationThreshold: { type: Number, default: 50 },
    bulkAccessThreshold: { type: Number, default: 30 },
    bulkAccessWindowMinutes: { type: Number, default: 5 },
    offHoursStart: { type: Number, default: 0 },
    offHoursEnd: { type: Number, default: 5 },
    impossibleTravelKmThreshold: { type: Number, default: 500 },
    impossibleTravelMinutesWindow: { type: Number, default: 60 },
    scanIntervalMinutes: { type: Number, default: 2 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

securityConfigSchema.statics.getConfig = async function () {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({ key: 'default' });
  }
  return doc;
};

securityConfigSchema.statics.getThresholds = async function () {
  const doc = await this.getConfig();
  return {
    failedLoginLimit: doc.failedLoginLimit,
    lockoutDurationMinutes: doc.lockoutDurationMinutes,
    anomalyEscalationThreshold: doc.anomalyEscalationThreshold,
    bulkAccessThreshold: doc.bulkAccessThreshold,
    bulkAccessWindowMinutes: doc.bulkAccessWindowMinutes,
    offHoursStart: doc.offHoursStart,
    offHoursEnd: doc.offHoursEnd,
    impossibleTravelKmThreshold: doc.impossibleTravelKmThreshold,
    impossibleTravelMinutesWindow: doc.impossibleTravelMinutesWindow,
    scanIntervalMinutes: doc.scanIntervalMinutes,
  };
};

module.exports = mongoose.model('SecurityConfig', securityConfigSchema);
