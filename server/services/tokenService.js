const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');

const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

const signRefreshToken = (userId) => {
  const jti = crypto.randomBytes(24).toString('hex');
  return {
    token: jwt.sign(
      { sub: userId.toString(), jti },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
      }
    ),
    jti,
  };
};

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSession = async ({ userId, refreshToken, ipAddress, userAgent, deviceInfo }) => {
  const session = await Session.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    ipAddress,
    userAgent,
    deviceInfo,
    lastActiveAt: new Date(),
  });
  return session;
};

const rotateSession = async (sessionId, newRefreshToken) => {
  await Session.updateOne(
    { _id: sessionId },
    { $set: { refreshTokenHash: hashToken(newRefreshToken), lastActiveAt: new Date() } }
  );
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  createSession,
  rotateSession,
};
