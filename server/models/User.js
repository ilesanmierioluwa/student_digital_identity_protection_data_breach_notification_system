const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['student', 'officer', 'admin'], required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    matricNumber: { type: String, unique: true, sparse: true, trim: true, uppercase: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    level: { type: String, enum: ['ND1', 'ND2', 'HND1', 'HND2'], default: null },
    phoneEncrypted: { type: String, default: null },
    ninEncrypted: { type: String, default: null },
    photoUrl: { type: String, default: null },
    idDocumentUrl: { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    profileVerified: { type: Boolean, default: false },
    profileNeedsVerification: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (this.role === 'admin') {
    this.departmentId = null;
    this.matricNumber = undefined;
  } else if ((this.role === 'student' || this.role === 'officer') && !this.departmentId) {
    throw new Error(`${this.role} account requires a departmentId`);
  }
});

userSchema.pre('save', async function () {
  if (this.isModified('passwordHash')) {
    this.passwordChangedAt = new Date();
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
