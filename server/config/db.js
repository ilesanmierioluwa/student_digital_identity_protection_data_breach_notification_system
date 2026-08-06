const mongoose = require('mongoose');
const logger = require('../utils/logger');

const RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 20000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    logger.error(`MongoDB connection error (attempt ${attempt}/${RETRY_ATTEMPTS})`, {
      error: err.message,
    });
    if (attempt < RETRY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      return connectDB(attempt + 1);
    }
    logger.error('MongoDB connection failed after retries — exiting');
    process.exit(1);
  }
};

module.exports = connectDB;
