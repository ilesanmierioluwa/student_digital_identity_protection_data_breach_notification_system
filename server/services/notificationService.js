const brevoApi = require('../config/brevo');
const logger = require('../utils/logger');
const crypto = require('crypto');
const BreachIncident = require('../models/BreachIncident');
const User = require('../models/User');
const Notification = require('../models/Notification');

const INSTITUTION = 'Delta State Polytechnic, Otefe-Oghara';

const generateOtp = () => {
  const buf = crypto.randomBytes(3);
  return String(buf.readUIntBE(0, 3) % 1000000).padStart(6, '0');
};

const sendTransactionalEmail = async ({ to, subject, html, text }) => {
  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME || INSTITUTION,
    },
    to: [{ email: to, name: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };
  const res = await brevoApi.post('/smtp/email', payload);
  return res.data;
};

const sendOtpEmail = async ({ to, otp, purpose }) => {
  const purposeLabel = purpose === 'register' ? 'account verification' : purpose === 'reset' ? 'password reset' : 'login verification';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:#0f2540;color:#fff;padding:20px;text-align:center">
        <h2 style="margin:0">${INSTITUTION}</h2>
        <p style="margin:4px 0 0;opacity:.8">Student Digital Identity Protection System</p>
      </div>
      <div style="padding:24px">
        <p>Hello,</p>
        <p>Your one-time passcode for <strong>${purposeLabel}</strong> is:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f2540">${otp}</div>
        <p style="font-size:13px;color:#64748b">This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share it with anyone. If you did not request this, ignore this email and change your password immediately.</p>
      </div>
      <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
        ${INSTITUTION} &bull; Otefe-Oghara, Delta State, Nigeria
      </div>
    </div>
  `;
  const text = `${INSTITUTION}\nYour one-time passcode for ${purposeLabel} is: ${otp}\nExpires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share it with anyone.`;
  return sendTransactionalEmail({ to, subject: `Your verification code — ${INSTITUTION}`, html, text });
};

const sendSecurityAlertEmail = async ({ to, alertType, message }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:#dc2626;color:#fff;padding:20px;text-align:center">
        <h2 style="margin:0">${INSTITUTION}</h2>
        <p style="margin:4px 0 0;opacity:.9">Security Alert</p>
      </div>
      <div style="padding:24px">
        <h3 style="margin-top:0">${alertType}</h3>
        <p>${message}</p>
        <p style="font-size:13px;color:#64748b">If this was not you, sign in immediately, change your password, and enable two-factor authentication. If you are locked out, please contact the IT/Security office.</p>
      </div>
      <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
        ${INSTITUTION} &bull; Otefe-Oghara, Delta State, Nigeria
      </div>
    </div>
  `;
  const text = `${INSTITUTION}\n\n${alertType}\n${message}\n\nIf this was not you, sign in immediately, change your password, and enable two-factor authentication.`;
  return sendTransactionalEmail({ to, subject: `Security alert: ${alertType} — ${INSTITUTION}`, html, text });
};

const sendBreachNotificationEmail = async ({ to, fullName, incidentTitle, severity }) => {
  const severityLabel = String(severity || 'medium').toUpperCase();
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:#b91c1c;color:#fff;padding:20px;text-align:center">
        <h2 style="margin:0">${INSTITUTION}</h2>
        <p style="margin:4px 0 0;opacity:.9">Important — Data Breach Notification</p>
      </div>
      <div style="padding:24px">
        <p>Dear ${fullName || 'Student'},</p>
        <p>Our security systems have identified a potential incident involving student identity records. <strong>This notice is being sent to you as a precaution.</strong></p>
        <p><strong>What happened (summary):</strong> ${incidentTitle}</p>
        <p><strong>Severity:</strong> ${severityLabel}</p>
        <p><strong>What may be affected:</strong> profile information held in the student records system, including contact details. No specific content of your record was exposed in this notice.</p>
        <p><strong>What we are doing:</strong> Our security team has been notified, the incident is being investigated, and affected access has been contained.</p>
        <p><strong>What you should do:</strong></p>
        <ul>
          <li>Sign in and change your password immediately.</li>
          <li>Enable two-factor authentication on your account.</li>
          <li>Review the "Who viewed my record" page for any activity you do not recognise.</li>
          <li>Contact the IT/Security office if you notice anything unusual.</li>
        </ul>
        <p style="font-size:13px;color:#64748b">Please do not reply to this automated email. If you have questions, contact the institution's IT/Security office directly.</p>
      </div>
      <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
        ${INSTITUTION} &bull; Otefe-Oghara, Delta State, Nigeria
      </div>
    </div>
  `;
  const text = [
    `${INSTITUTION}`,
    `IMPORTANT — Data Breach Notification`,
    ``,
    `Dear ${fullName || 'Student'},`,
    `Our security systems have identified a potential incident involving student identity records. This notice is sent as a precaution.`,
    ``,
    `What happened (summary): ${incidentTitle}`,
    `Severity: ${severityLabel}`,
    `What may be affected: profile information held in the student records system, including contact details. No specific content of your record was exposed in this notice.`,
    `What we are doing: the incident is being investigated and affected access has been contained.`,
    `What you should do: sign in and change your password immediately, enable two-factor authentication, and review the "Who viewed my record" page. Contact the IT/Security office if you notice anything unusual.`,
    ``,
    INSTITUTION,
  ].join('\n');
  return sendTransactionalEmail({ to, subject: `Data breach notice — ${INSTITUTION}`, html, text });
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const processIncidentNotifications = async (incidentId) => {
  let incident;
  try {
    incident = await BreachIncident.findById(incidentId);
    if (!incident) {
      logger.error(`[NOTIFY] Incident ${incidentId} not found — skipping notifications`);
      return null;
    }
  } catch (err) {
    logger.error(`[NOTIFY] Could not load incident ${incidentId}: ${err.message}`);
    return null;
  }

  if (incident.notificationsSentAt) {
    logger.info(`[NOTIFY] Incident ${incidentId} already notified at ${incident.notificationsSentAt}`);
    return incident;
  }

  const users = await User.find({ _id: { $in: incident.affectedUserIds } }).select('_id email fullName');
  const deliveries = [];

  for (const user of users) {
    const entry = { userId: user._id, email: user.email, status: 'pending', attempts: 0 };
    let success = false;
    let lastError = '';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      entry.attempts = attempt;
      try {
        await sendBreachNotificationEmail({
          to: user.email,
          fullName: user.fullName,
          incidentTitle: incident.title,
          severity: incident.severity,
        });
        entry.status = 'sent';
        entry.sentAt = new Date();
        success = true;
        logger.info(`[NOTIFY] Breach email sent to ${user.email} (attempt ${attempt}) for incident ${incidentId}`);
        break;
      } catch (err) {
        lastError = err.message;
        logger.error(`[NOTIFY] Brevo send failed for ${user.email} (attempt ${attempt}): ${err.message}`);
        if (attempt < 3) await delay(1500 * attempt);
      }
    }

    if (!success) {
      entry.status = 'failed';
      entry.error = lastError.slice(0, 500);
    }

    await Notification.create({
      userId: user._id,
      incidentId,
      type: 'BREACH_ALERT',
      title: `Data breach notice: ${incident.title}`,
      message:
        'Our security systems flagged a potential incident involving student identity records. Sign in, change your password, and enable two-factor authentication as a precaution.',
    });

    deliveries.push(entry);
  }

  incident.deliveryStatus = deliveries;
  incident.notificationsSentAt = new Date();
  await incident.save();
  logger.info(`[NOTIFY] Incident ${incidentId}: ${deliveries.filter((d) => d.status === 'sent').length} sent, ${deliveries.filter((d) => d.status === 'failed').length} failed`);

  return incident;
};

const queueIncidentNotifications = (incidentId) => {
  processIncidentNotifications(incidentId).catch((err) => {
    logger.error(`[NOTIFY] Notification pipeline failed for ${incidentId}: ${err.message}`);
  });
};

module.exports = {
  INSTITUTION,
  generateOtp,
  sendTransactionalEmail,
  sendOtpEmail,
  sendSecurityAlertEmail,
  sendBreachNotificationEmail,
  processIncidentNotifications,
  queueIncidentNotifications,
  log: logger,
};
