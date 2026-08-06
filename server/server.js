const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ quiet: true });
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const app = require('./app');
const { startAnomalyScanJob, stopAnomalyScanJob } = require('./jobs/anomalyScanJob');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  const anomalyTask = await startAnomalyScanJob();

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    stopAnomalyScanJob(anomalyTask);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();
