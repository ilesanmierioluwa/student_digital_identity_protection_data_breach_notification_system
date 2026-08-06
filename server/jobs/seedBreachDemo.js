require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const connectDB = require('../config/db');
const User = require('../models/User');
const AnomalyFlag = require('../models/AnomalyFlag');
const BreachIncident = require('../models/BreachIncident');
const Department = require('../models/Department');
const logger = require('../utils/logger');

const API = process.env.DEMO_API_URL || 'http://localhost:5000';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo.student@dspz.edu.ng';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@1234';
const ROUNDS = Number(process.env.DEMO_ROUNDS) || 3;
const FAILURES_PER_ROUND = Number(process.env.DEMO_FAILURES_PER_ROUND) || 5;

const IP_POOL = [
  '1.2.3.4',
  '41.79.99.99',
  '8.8.8.8',
  '154.113.10.50',
  '198.51.100.20',
  '203.0.113.10',
  '77.66.55.44',
  '9.9.9.9',
  '123.45.67.89',
  '61.240.150.5',
];

const randIp = () => IP_POOL[Math.floor(Math.random() * IP_POOL.length)];

const attemptLogin = async (email, password, ip) => {
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
        'User-Agent': 'credential-stuffing-simulator/1.0',
      },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: { message: `Network error: ${err.message}` } };
  }
};

const main = async () => {
  await connectDB();
  logger.info(`[DEMO] Credential-stuffing simulation against ${DEMO_EMAIL}`);

  let demo = await User.findOne({ email: DEMO_EMAIL, role: 'student' });
  if (!demo) {
    const dept = await Department.findOne({ isActive: true });
    if (!dept) throw new Error('No active department found to create demo student');
    demo = await User.create({
      role: 'student',
      fullName: 'Demo Breach Student',
      email: DEMO_EMAIL,
      matricNumber: 'DEMO/2024/SEC/001',
      departmentId: dept._id,
      level: 'ND2',
      passwordHash: require('bcryptjs').hashSync(DEMO_PASSWORD, 12),
      isEmailVerified: true,
      profileVerified: true,
    });
    logger.info(`[DEMO] Created demo student ${demo.email} (${demo.matricNumber})`);
  }

  const before = {
    flags: await AnomalyFlag.countDocuments({ userId: demo._id }),
    incidents: await BreachIncident.countDocuments({ affectedUserIds: demo._id }),
  };

  let round = 0;
  while (round < ROUNDS) {
    round += 1;
    logger.info(`[DEMO] Round ${round}/${ROUNDS}: firing ${FAILURES_PER_ROUND} wrong-password logins from varied IPs...`);
    for (let i = 0; i < FAILURES_PER_ROUND; i++) {
      const ip = randIp();
      const { status, body } = await attemptLogin(DEMO_EMAIL, `WrongPass${i}`, ip);
      logger.info(`[DEMO]   IP ${ip} -> HTTP ${status} (${body.message || 'no message'})`);
    }

    const user = await User.findById(demo._id);
    if (user && user.lockUntil) {
      logger.info(`[DEMO] Account locked as expected. Unlocking for next round...`);
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    if (round < ROUNDS) await new Promise((r) => setTimeout(r, 1500));
  }

  const flags = await AnomalyFlag.find({ userId: demo._id }).sort({ createdAt: -1 }).lean();
  const incidents = await BreachIncident.find({ affectedUserIds: demo._id }).sort({ detectedAt: -1 }).lean();

  logger.info('[DEMO] ===== SUMMARY =====');
  logger.info(`[DEMO] AnomalyFlags before: ${before.flags}, after: ${flags.length}`);
  logger.info(`[DEMO] BreachIncidents before: ${before.incidents}, after: ${incidents.length}`);
  for (const f of flags.slice(0, 10)) {
    logger.info(`[DEMO]   FLAG ${f.type} score=${f.score} ip=${f.details.ipAddress || '-'} reviewed=${f.reviewed} at=${f.createdAt}`);
  }
  for (const inc of incidents.slice(0, 5)) {
    logger.info(`[DEMO]   INCIDENT ${inc.severity} "${inc.title}" status=${inc.status} at=${inc.detectedAt}`);
  }
  logger.info('[DEMO] Done. Watch the live Security Dashboard for the flags.');
  process.exit(0);
};

main().catch((err) => {
  logger.error(`[DEMO] Failed: ${err.message}`);
  process.exit(1);
});
