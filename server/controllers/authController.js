const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const Session = require('../models/Session');
const Department = require('../models/Department');
const School = require('../models/School');
const BreachIncident = require('../models/BreachIncident');
const SecurityConfig = require('../models/SecurityConfig');
const { validationResult } = require('express-validator');
const { writeAuditLog } = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const anomalyEngine = require('../services/anomalyEngine');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  createSession,
  rotateSession,
} = require('../services/tokenService');
const { generateOtp, sendOtpEmail, sendSecurityAlertEmail } = require('../services/notificationService');

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS) || 60;

const getLoginThresholds = async () => {
  try {
    const cfg = await SecurityConfig.getThresholds();
    return {
      failedLoginLimit: cfg.failedLoginLimit,
      lockoutDurationMinutes: cfg.lockoutDurationMinutes,
    };
  } catch (err) {
    logger.warn(`[SECURITY] Falling back to env login thresholds: ${err.message}`);
    return {
      failedLoginLimit: Number(process.env.FAILED_LOGIN_LIMIT) || 5,
      lockoutDurationMinutes: Number(process.env.LOCKOUT_DURATION_MINUTES) || 15,
    };
  }
};

const setRefreshTokenCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshTokenCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const createAndSendOtp = async (user, purpose, res, ipAddress) => {
  const recent = await OtpCode.findOne({
    userId: user._id,
    purpose,
    createdAt: { $gte: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
  });
  if (recent) {
    return res.status(429).json({
      success: false,
      message: `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another code`,
    });
  }

  const otp = generateOtp();
  await OtpCode.create({
    userId: user._id,
    codeHash: hashOtp(otp),
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });
  await sendOtpEmail({ to: user.email, otp, purpose });

  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] OTP for ${user.email} (${purpose}): ${otp}`);
  }
};

const issueTokens = async (req, res, user) => {
  const refresh = signRefreshToken(user._id);
  await createSession({
    userId: user._id,
    refreshToken: refresh.token,
    ipAddress: req.clientIp,
    userAgent: req.userAgent || req.headers['user-agent'] || '',
    deviceInfo: req.body?.deviceInfo || (req.headers['user-agent'] || '').slice(0, 120),
  });
  const accessToken = signAccessToken(user);
  setRefreshTokenCookie(res, refresh.token);
  return { accessToken };
};

const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { fullName, email, matricNumber, departmentId, level, password } = req.body;

    const [existingEmail, existingMatric, department] = await Promise.all([
      User.findOne({ email: email.toLowerCase() }),
      User.findOne({ matricNumber: matricNumber.toUpperCase() }),
      Department.findById(departmentId),
    ]);

    if (existingEmail) return res.status(409).json({ success: false, message: 'Email is already registered' });
    if (existingMatric) return res.status(409).json({ success: false, message: 'Matric number already registered' });
    if (!department) return res.status(400).json({ success: false, message: 'Selected department does not exist' });
    if (!department.isActive) return res.status(400).json({ success: false, message: 'Selected department is inactive' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      role: 'student',
      fullName,
      email: email.toLowerCase(),
      matricNumber: matricNumber.toUpperCase(),
      departmentId: department._id,
      level: level || null,
      passwordHash,
      isEmailVerified: false,
    });

    await createAndSendOtp(user, 'register', res, req.clientIp);

    res.status(201).json({
      success: true,
      message: 'Registration successful. A 6-digit verification code has been sent to your email.',
      data: { userId: user._id, email: user.email, requiresOtp: true },
    });
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, purpose } = req.body;
    const user = email ? await User.findOne({ email: email.toLowerCase() }) : null;
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    await createAndSendOtp(user, purpose, res, req.clientIp);
    res.json({ success: true, message: 'A new verification code has been sent.' });
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { otp, purpose, email } = req.body;

    let user = null;
    if (purpose === 'login') {
      user = await User.findById(req.body.userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    const record = await OtpCode.findOne({
      userId: user._id,
      purpose,
      used: false,
    }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ success: false, message: 'No valid code found. Request a new one.' });
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This code has expired. Request a new one.' });
    }
    if (record.codeHash !== hashOtp(otp)) {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    record.used = true;
    await record.save();

    if (purpose === 'register') {
      user.isEmailVerified = true;
      await user.save();
      return res.json({
        success: true,
        message: 'Email verified successfully. You can now sign in.',
      });
    }

    if (purpose === 'login') {
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated or locked' });
      }
      const { accessToken } = await issueTokens(req, res, user);
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
      writeAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.clientIp,
        userAgent: req.userAgent || req.headers['user-agent'] || '',
      });
      anomalyEngine
        .evaluateLoginAnomalies({ userId: user._id, ipAddress: req.clientIp, userAgent: req.headers['user-agent'] || '' })
        .catch((err) => logger.error(`[ANOMALY] Login evaluation failed: ${err.message}`));
      return res.json({ success: true, message: 'Login successful', data: { user: user.toSafeJSON(), accessToken } });
    }

    res.status(400).json({ success: false, message: 'Invalid OTP purpose' });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const ipAddress = req.clientIp || req.ip;
  const userAgent = req.headers['user-agent'] || '';

  try {
    const { email, password } = req.body;
    const { failedLoginLimit, lockoutDurationMinutes } = await getLoginThresholds();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      writeAuditLog({ action: 'LOGIN_FAILURE', ipAddress, userAgent, metadata: { email, reason: 'NO_ACCOUNT' } });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      sendSecurityAlertEmail({
        to: user.email,
        alertType: 'Someone tried to access your account',
        message:
          'A sign-in attempt was made on your account while it is temporarily locked after repeated failed login attempts.',
      }).catch(() => {});
      writeAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'LOGIN_FAILURE',
        targetUserId: user._id,
        ipAddress,
        userAgent,
        metadata: { reason: 'ACCOUNT_LOCKED_ATTEMPT' },
      });
      const mins = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to too many failed attempts. Try again in ${mins} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      writeAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'LOGIN_FAILURE',
        targetUserId: user._id,
        ipAddress,
        userAgent,
        metadata: { attempt: user.failedLoginAttempts },
      });

      if (user.failedLoginAttempts >= failedLoginLimit) {
        user.lockUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);
        user.failedLoginAttempts = 0;
        await user.save();
        writeAuditLog({
          actorUserId: user._id,
          actorRole: user.role,
          action: 'ACCOUNT_LOCKED',
          targetUserId: user._id,
          ipAddress,
          userAgent,
          metadata: { lockDurationMinutes: lockoutDurationMinutes },
        });
        await anomalyEngine.recordMultipleFailedLogins({
          userId: user._id,
          failedAttempts: failedLoginLimit,
          ipAddress,
          userAgent,
        });
        await sendSecurityAlertEmail({
          to: user.email,
          alertType: 'Your account has been locked',
          message: `Your account was locked after ${failedLoginLimit} consecutive failed sign-in attempts. It will be unlocked automatically in ${lockoutDurationMinutes} minutes.`,
        }).catch(() => {});
        return res.status(423).json({
          success: false,
          message: `Account locked after ${failedLoginLimit} failed attempts. Try again in ${lockoutDurationMinutes} minutes.`,
        });
      }

      await user.save();
      const remaining = failedLoginLimit - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
      });
    }

    if (!user.isEmailVerified && user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for the verification code.',
        requiresOtp: true,
        purpose: 'register',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated or locked' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    if (user.twoFactorEnabled) {
      await createAndSendOtp(user, 'login', res, ipAddress);
      writeAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'ADMIN_ACTION',
        ipAddress,
        userAgent,
        metadata: { operation: 'TWO_FACTOR_CHALLENGE', email: user.email },
      });
      return res.json({
        success: true,
        message: 'Two-factor verification required. Enter the code sent to your email.',
        data: { requiresOtp: true, purpose: 'login', userId: user._id },
      });
    }

    const { accessToken } = await issueTokens(req, res, user);
    writeAuditLog({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
    });

    anomalyEngine.evaluateLoginAnomalies({ userId: user._id, ipAddress, userAgent }).catch((err) => {
      logger.error(`[ANOMALY] Login evaluation failed: ${err.message}`);
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.toSafeJSON(), accessToken, mustChangePassword: user.mustChangePassword || false },
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token provided' });

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const tokenHash = hashToken(refreshToken);
    const session = await Session.findOne({ refreshTokenHash: tokenHash });

    if (session && !session.isRevoked && session.userId.toString() === decoded.sub) {
      const user = await User.findById(session.userId);
      if (!user || !user.isActive) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({ success: false, message: 'Account is unavailable' });
      }

      const newRefresh = signRefreshToken(user._id);
      await rotateSession(session._id, newRefresh.token);
      const accessToken = signAccessToken(user);
      setRefreshTokenCookie(res, newRefresh.token);

      session.lastActiveAt = new Date();
      await session.save();

      return res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
    }

    const userStillExists = decoded?.sub ? await User.findById(decoded.sub) : null;
    if (userStillExists) {
      logger.warn(`Refresh token reuse detected for user ${decoded.sub}`);
      await Session.updateMany(
        { userId: userStillExists._id, isRevoked: false },
        { $set: { isRevoked: true, revokedReason: 'REFRESH_TOKEN_REUSE' } }
      );
      await AnomalyFlag.create({
        userId: userStillExists._id,
        type: 'REFRESH_TOKEN_REUSE',
        score: 90,
        details: { message: 'Stale refresh token presented after rotation — treating as compromised' },
      });
      await BreachIncident.create({
        title: 'Refresh token reuse detected',
        description:
          'A previously rotated refresh token was presented again. This is characteristic of a stolen-session attack, so all sessions were revoked and this incident was raised automatically.',
        severity: 'high',
        detectionMethod: 'token_reuse',
        affectedUserIds: [userStillExists._id],
        status: 'open',
      });
      writeAuditLog({
        actorUserId: userStillExists._id,
        actorRole: userStillExists.role,
        action: 'REFRESH_TOKEN_REUSED',
        targetUserId: userStillExists._id,
        ipAddress: req.clientIp,
        userAgent: req.userAgent || req.headers['user-agent'] || '',
      });
    }

    clearRefreshTokenCookie(res);
    return res.status(401).json({
      success: false,
      message: 'Session expired — all sessions revoked due to token reuse detection',
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const session = await Session.findOneAndUpdate(
        { refreshTokenHash: tokenHash, isRevoked: false },
        { $set: { isRevoked: true, revokedReason: 'logout' } },
        { new: true }
      );
      if (session && req.user) {
        writeAuditLog({
          actorUserId: req.user._id,
          actorRole: req.user.role,
          action: 'LOGOUT',
          ipAddress: req.clientIp,
          userAgent: req.userAgent,
        });
      }
    }
    clearRefreshTokenCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'departmentId',
      populate: { path: 'schoolId', select: 'name code' },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user: user.toSafeJSON(), department: user.departmentId || null } });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.mustChangePassword) {
      const isOk = await user.matchPassword(newPassword);
      if (currentPassword === newPassword || isOk) {
        return res.status(400).json({ success: false, message: 'New password must differ from the temporary password' });
      }
    } else {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await Session.updateMany(
        { userId: user._id, isRevoked: false, refreshTokenHash: { $ne: hashToken(refreshToken) } },
        { $set: { isRevoked: true, revokedReason: 'PASSWORD_CHANGE' } }
      );
    } else {
      await Session.updateMany({ userId: user._id, isRevoked: false }, { $set: { isRevoked: true, revokedReason: 'PASSWORD_CHANGE' } });
    }

    writeAuditLog({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_CHANGE',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { forcedChange: req.body.mustChangePassword === true },
    });

    res.json({ success: true, message: 'Password changed successfully. Other sessions have been logged out.' });
  } catch (err) {
    next(err);
  }
};

const getMySessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });

    let currentHash = null;
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) currentHash = hashToken(refreshToken);

    const data = sessions.map((s) => ({
      _id: s._id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isRevoked: s.isRevoked,
      revokedReason: s.revokedReason,
      isCurrent: currentHash !== null && s.refreshTokenHash === currentHash,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (session.isRevoked) return res.status(400).json({ success: false, message: 'Session already revoked' });

    session.isRevoked = true;
    session.revokedReason = 'user_revoked';
    await session.save();

    let revokeCurrent = false;
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken && session.refreshTokenHash === hashToken(refreshToken)) {
      revokeCurrent = true;
      clearRefreshTokenCookie(res);
    }

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'SESSION_REVOKED',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { sessionId: session._id, revokeCurrent },
    });

    res.json({ success: true, message: revokeCurrent ? 'Current session revoked — you are signed out' : 'Session revoked' });
  } catch (err) {
    next(err);
  }
};

const revokeAllSessions = async (req, res, next) => {
  try {
    await Session.updateMany(
      { userId: req.user._id, isRevoked: false },
      { $set: { isRevoked: true, revokedReason: 'user_revoked_all' } }
    );
    clearRefreshTokenCookie(res);

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'SESSION_REVOKED',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'REVOKE_ALL' },
    });

    res.json({ success: true, message: 'All sessions revoked — you are signed out everywhere' });
  } catch (err) {
    next(err);
  }
};

const enableTwoFactor = async (req, res, next) => {
  try {
    if (req.user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled' });
    }
    await createAndSendOtp(req.user, 'login', res, req.clientIp);
    res.json({
      success: true,
      message: 'A verification code has been sent to your email. Enter it to enable two-factor authentication.',
      data: { requiresOtp: true, userId: req.user._id, purpose: 'login' },
    });
  } catch (err) {
    next(err);
  }
};

const confirmTwoFactor = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ success: false, message: 'A 6-digit code is required' });
    }
    const record = await OtpCode.findOne({
      userId: req.user._id,
      purpose: 'login',
      used: false,
    }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ success: false, message: 'No pending code found. Request a new one.' });
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This code has expired. Request a new one.' });
    }
    if (record.codeHash !== hashOtp(otp)) {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    record.used = true;
    await record.save();

    req.user.twoFactorEnabled = true;
    await req.user.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'TWO_FACTOR_ENABLED' },
    });

    res.json({ success: true, message: 'Two-factor authentication enabled. You will need a code on every login.' });
  } catch (err) {
    next(err);
  }
};

const disableTwoFactor = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!req.user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled' });
    }
    const isMatch = await req.user.matchPassword(password || '');
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });

    req.user.twoFactorEnabled = false;
    await req.user.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'TWO_FACTOR_DISABLED' },
    });

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  resendOtp,
  verifyOtp,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  getMySessions,
  revokeSession,
  revokeAllSessions,
  enableTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
};
