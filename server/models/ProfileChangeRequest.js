const mongoose = require('mongoose');

const profileChangeRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedChanges: { type: mongoose.Schema.Types.Mixed, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewerNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

profileChangeRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ProfileChangeRequest', profileChangeRequestSchema);
