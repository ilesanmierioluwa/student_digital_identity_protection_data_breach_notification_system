const User = require('../models/User');
const Department = require('../models/Department');
const ProfileChangeRequest = require('../models/ProfileChangeRequest');
const encryptionService = require('../services/encryptionService');
const anomalyEngine = require('../services/anomalyEngine');
const logger = require('../utils/logger');
const { writeAuditLog } = require('../middleware/auditLogger');

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

const listDepartmentStudents = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = { role: 'student', departmentId: req.user.departmentId };

    if (req.query.search) {
      const term = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ fullName: term }, { matricNumber: term }, { email: term }];
    }
    if (req.query.verified === 'true') filter.profileVerified = true;
    if (req.query.verified === 'false') filter.profileVerified = false;

    const [students, total] = await Promise.all([
      User.find(filter).select('fullName matricNumber email level isActive profileVerified profileNeedsVerification').sort({ matricNumber: 1 }).skip(skip).limit(take),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { students, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const getStudentRecord = async (req, res, next) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: 'student',
      departmentId: req.user.departmentId,
    }).populate({
      path: 'departmentId',
      populate: { path: 'schoolId', select: 'name code' },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found in your department' });
    }

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'VIEW_RECORD',
      targetUserId: student._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { matricNumber: student.matricNumber },
    });

    anomalyEngine.checkBulkExport(req.user._id).catch((err) => {
      logger.error(`[ANOMALY] Bulk export check failed: ${err.message}`);
    });

    res.json({
      success: true,
      data: {
        student: student.toSafeJSON(),
        department: student.departmentId || null,
        phone: encryptionService.decrypt(student.phoneEncrypted),
      },
    });
  } catch (err) {
    next(err);
  }
};

const listPendingProfileChanges = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student', departmentId: req.user.departmentId }).select('_id');
    const requests = await ProfileChangeRequest.find({
      userId: { $in: students.map((s) => s._id) },
      status: 'pending',
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'fullName matricNumber email');
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

const reviewProfileChange = async (req, res, next) => {
  try {
    const { decision, notes } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
    }

    const request = await ProfileChangeRequest.findById(req.params.id).populate('userId');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const student = request.userId;
    if (!student || student.departmentId?.toString() !== req.user.departmentId?.toString()) {
      return res.status(403).json({ success: false, message: 'This request is outside your department' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
    }

    if (decision === 'approve') {
      const changes = request.requestedChanges || {};
      if (changes.phone) student.phoneEncrypted = encryptionService.encrypt(changes.phone);
      if (changes.nin) student.ninEncrypted = encryptionService.encrypt(changes.nin);
      if (changes.fullName) student.fullName = changes.fullName;
      if (changes.matricNumber) student.matricNumber = changes.matricNumber;
      if (changes.level) student.level = changes.level;
      if (changes.departmentId) student.departmentId = changes.departmentId;
      await student.save();
    }

    request.status = decision === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewerNotes = notes || '';
    await request.save();

    const stillNeedsReview = await ProfileChangeRequest.exists({
      userId: student._id,
      status: 'pending',
    });
    if (!stillNeedsReview) {
      student.profileNeedsVerification = false;
      await student.save();
    }

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'PROFILE_CHANGE_REVIEWED',
      targetUserId: student._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { requestId: request._id, decision },
    });

    res.json({
      success: true,
      message: decision === 'approve' ? 'Changes approved and applied' : 'Changes rejected',
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

const verifyStudentProfile = async (req, res, next) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: 'student',
      departmentId: req.user.departmentId,
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found in your department' });
    }

    student.profileVerified = true;
    student.profileNeedsVerification = false;
    await student.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'PROFILE_VERIFIED',
      targetUserId: student._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
    });

    res.json({ success: true, message: 'Student profile verified', data: { student: student.toSafeJSON() } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDepartmentStudents,
  getStudentRecord,
  listPendingProfileChanges,
  reviewProfileChange,
  verifyStudentProfile,
};
