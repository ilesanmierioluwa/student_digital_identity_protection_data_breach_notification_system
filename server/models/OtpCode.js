const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['register', 'login', 'reset'], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OtpCode', otpSchema);
