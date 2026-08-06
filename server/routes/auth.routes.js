const express = require('express');
const router = express.Router();
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');
const {
  registerValidators,
  loginValidators,
  otpValidators,
  resendOtpValidators,
} = require('../middleware/validators');
const {
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
} = require('../controllers/authController');

router.post('/register', registerValidators, register);
router.post('/resend-otp', otpLimiter, resendOtpValidators, resendOtp);
router.post('/verify-otp', otpLimiter, otpValidators, verifyOtp);
router.post('/login', loginLimiter, loginValidators, login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.get('/sessions', protect, getMySessions);
router.post('/sessions/:id/revoke', protect, revokeSession);
router.post('/sessions/revoke-all', protect, revokeAllSessions);
router.post('/2fa/enable', protect, enableTwoFactor);
router.post('/2fa/confirm', protect, confirmTwoFactor);
router.post('/2fa/disable', protect, disableTwoFactor);

module.exports = router;
