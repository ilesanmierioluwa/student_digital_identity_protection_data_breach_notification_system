const logger = require('../utils/logger');

const registerRoutes = (app) => {
  app.use('/api/auth', require('./auth.routes'));
  app.use('/api/academic', require('./academicStructure.routes'));
  app.use('/api/students', require('./student.routes'));
  app.use('/api/officers', require('./officer.routes'));
  app.use('/api/admin', require('./admin.routes'));
  app.use('/api/security', require('./security.routes'));
  app.use('/api/notifications', require('./notification.routes'));
  logger.info('API routes registered');
};

module.exports = registerRoutes;
