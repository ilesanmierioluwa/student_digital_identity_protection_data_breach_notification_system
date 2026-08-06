const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');

const getClientIp = (req) =>
  (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
  req.ip ||
  req.socket?.remoteAddress ||
  '';

const clientIpMiddleware = (req, res, next) => {
  req.clientIp = getClientIp(req);
  req.userAgent = req.headers['user-agent'] || '';
  next();
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
  }
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized — account not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated or locked' });
    }
    req.user = user;
    req.clientIp = getClientIp(req);
    req.userAgent = req.headers['user-agent'] || '';
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired — please sign in again'
        : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden — insufficient permissions' });
    }
    next();
  };

module.exports = { protect, authorize, getClientIp, clientIpMiddleware };
