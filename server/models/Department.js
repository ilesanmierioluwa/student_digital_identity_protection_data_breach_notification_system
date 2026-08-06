const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isActive: { type: Boolean, default: true },
    needsReview: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

departmentSchema.index({ schoolId: 1, name: 1 }, { unique: true });
departmentSchema.index({ schoolId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
