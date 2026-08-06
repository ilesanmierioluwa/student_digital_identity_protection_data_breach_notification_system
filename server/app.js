const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const logger = require('./utils/logger');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { clientIpMiddleware } = require('./middleware/auth');

const fsSync = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fsSync.existsSync(logDir)) fsSync.mkdirSync(logDir, { recursive: true });

const app = express();

const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_ORIGIN.split(',')
    : [process.env.CLIENT_ORIGIN || 'http://localhost:5173'];

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(clientIpMiddleware);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    institution: 'Delta State Polytechnic, Otefe-Oghara',
    service: 'Student Digital Identity Protection & Data Breach Notification System',
    time: new Date().toISOString(),
  });
});

require('./routes')(app);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
