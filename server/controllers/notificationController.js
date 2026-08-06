const Notification = require('../models/Notification');

const listMyNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    res.json({
      success: true,
      data: { notifications, total, page, limit, pages: Math.ceil(total / limit), unread },
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, data: { unread: count } });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: `Marked ${result.modifiedCount} notification(s) as read` });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMyNotifications, getUnreadCount, markRead, markAllRead };
