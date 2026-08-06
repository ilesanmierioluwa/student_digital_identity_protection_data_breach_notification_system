const cron = require('node-cron');
const User = require('../models/User');
const SecurityConfig = require('../models/SecurityConfig');
const anomalyEngine = require('../services/anomalyEngine');
const logger = require('../utils/logger');

const startAnomalyScanJob = async () => {
  let cfg;
  try {
    cfg = await SecurityConfig.getThresholds();
  } catch (err) {
    cfg = { scanIntervalMinutes: 2 };
    logger.warn(`[ANOMALY] Scan job could not load config: ${err.message}`);
  }

  const minutes = Math.max(1, cfg.scanIntervalMinutes || 2);
  const expression = `*/${minutes} * * * *`;

  const task = cron.schedule(
    expression,
    async () => {
      try {
        logger.info('[ANOMALY] Running periodic anomaly scan...');
        const officers = await User.find({ role: 'officer', isActive: true }).select('_id fullName');
        for (const officer of officers) {
          await anomalyEngine.checkBulkExport(officer._id);
        }
        logger.info(`[ANOMALY] Scan complete (checked ${officers.length} officer(s)).`);
      } catch (err) {
        logger.error(`[ANOMALY] Scan job error: ${err.message}`);
      }
    },
    { scheduled: true }
  );

  task.start();
  logger.info(`[ANOMALY] Scan job scheduled: every ${minutes} minute(s)`);
  return task;
};

const stopAnomalyScanJob = (task) => {
  if (task) task.stop();
};

module.exports = { startAnomalyScanJob, stopAnomalyScanJob };
