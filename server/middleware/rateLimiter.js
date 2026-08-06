const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.clientIp || req.ip || 'unknown',
  handler: (req, res) => {
    logger.warn('Rate limit hit on login route', { ip: req.clientIp || req.ip });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts — please try again after 15 minutes',
    });
  },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests — please wait a moment' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please slow down' },
});

module.exports = { loginLimiter, otpLimiter, apiLimiter };
