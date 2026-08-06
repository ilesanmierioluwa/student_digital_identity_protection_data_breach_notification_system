const User = require('../models/User');
const ProfileChangeRequest = require('../models/ProfileChangeRequest');
const Department = require('../models/Department');
const encryptionService = require('../services/encryptionService');
const { writeAuditLog } = require('../middleware/auditLogger');
const { uploadBufferToCloudinary, deleteFromCloudinary, getPublicId } = require('../middleware/upload');

const FLAGGED_FIELDS = ['fullName', 'matricNumber', 'departmentId', 'level', 'phone', 'nin'];

const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'departmentId',
      populate: { path: 'schoolId', select: 'name code' },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        user: user.toSafeJSON(),
        department: user.departmentId || null,
        phone: encryptionService.decrypt(user.phoneEncrypted),
        nin: encryptionService.decrypt(user.ninEncrypted),
        profileVerified: user.profileVerified,
        profileNeedsVerification: user.profileNeedsVerification,
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const body = req.body || {};
    const flaggedChanges = {};

    if (body.phone !== undefined) {
      if (user.phoneEncrypted && user.phoneEncrypted !== encryptionService.encrypt(body.phone)) {
        flaggedChanges.phone = body.phone;
      }
    }
    if (body.nin !== undefined && body.nin !== '') {
      if (!user.ninEncrypted || user.ninEncrypted !== encryptionService.encrypt(body.nin)) {
        flaggedChanges.nin = body.nin;
      }
    }
    if (body.fullName !== undefined && body.fullName.trim() !== user.fullName) {
      flaggedChanges.fullName = body.fullName.trim();
    }
    if (body.matricNumber !== undefined && body.matricNumber.trim().toUpperCase() !== user.matricNumber) {
      flaggedChanges.matricNumber = body.matricNumber.trim().toUpperCase();
    }
    if (body.level !== undefined && body.level !== user.level) {
      flaggedChanges.level = body.level;
    }
    if (body.departmentId !== undefined && body.departmentId !== String(user.departmentId || '')) {
      const dept = await Department.findById(body.departmentId);
      if (!dept || !dept.isActive) {
        return res.status(400).json({ success: false, message: 'Selected department is invalid or inactive' });
      }
      flaggedChanges.departmentId = dept._id;
    }

    if (Object.keys(flaggedChanges).length > 0) {
      const request = await ProfileChangeRequest.create({
        userId: user._id,
        requestedChanges: flaggedChanges,
        reason: body.reason || 'Student requested profile update',
      });
      user.profileNeedsVerification = true;
      await user.save();
      writeAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'PROFILE_UPDATE',
        targetUserId: user._id,
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        metadata: { operation: 'FLAGGED_CHANGE_REQUESTED', requestId: request._id, fields: Object.keys(flaggedChanges) },
      });
      return res.json({
        success: true,
        message:
          'Your requested changes touch identity fields and must be verified by a records officer before taking effect. A verification request has been submitted.',
        data: { requestId: request._id, pendingFields: Object.keys(flaggedChanges) },
      });
    }

    if (body.phone !== undefined) {
      user.phoneEncrypted = encryptionService.encrypt(body.phone) || user.phoneEncrypted;
    }

    writeAuditLog({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'PROFILE_UPDATE',
      targetUserId: user._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'NON_FLAGGED_UPDATE', fields: Object.keys(body) },
    });

    await user.save();
    res.json({ success: true, message: 'Profile updated', data: { user: user.toSafeJSON() } });
  } catch (err) {
    next(err);
  }
};

const uploadDocuments = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const uploaded = {};
    for (const field of ['photo', 'idDocument']) {
      const file = req.files[field] && req.files[field][0];
      if (file) {
        const result = await uploadBufferToCloudinary(file.buffer, {
          folder: `dspz/${user.role}/${user._id}`,
          resourceType: file.mimetype === 'application/pdf' ? 'raw' : 'image',
        });
        uploaded[field] = result.secure_url;
      }
    }

    if (uploaded.photo) {
      if (user.photoUrl) await deleteFromCloudinary(getPublicId(user.photoUrl));
      user.photoUrl = uploaded.photo;
    }
    if (uploaded.idDocument) {
      if (user.idDocumentUrl) await deleteFromCloudinary(getPublicId(user.idDocumentUrl));
      user.idDocumentUrl = uploaded.idDocument;
    }

    await user.save();

    writeAuditLog({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'DOCUMENT_UPLOAD',
      targetUserId: user._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { fields: Object.keys(uploaded) },
    });

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { photoUrl: user.photoUrl, idDocumentUrl: user.idDocumentUrl },
    });
  } catch (err) {
    if (err.message && err.message.includes('File type not allowed')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

const getMyProfileChanges = async (req, res, next) => {
  try {
    const requests = await ProfileChangeRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyProfile, updateMyProfile, uploadDocuments, getMyProfileChanges };
