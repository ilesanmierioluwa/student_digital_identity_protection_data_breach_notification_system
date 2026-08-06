const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', listMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);

module.exports = router;
