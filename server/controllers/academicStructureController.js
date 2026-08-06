const School = require('../models/School');
const Department = require('../models/Department');
const { validationResult } = require('express-validator');
const { writeAuditLog } = require('../middleware/auditLogger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

const getPublicSchools = async (req, res, next) => {
  try {
    const schools = await School.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: schools });
  } catch (err) {
    next(err);
  }
};

const getPublicDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('schoolId', 'name code isActive')
      .sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

const createSchool = async (req, res, next) => {
  if (handleValidation(req, res)) return;
  try {
    const school = await School.create({
      name: req.body.name.trim(),
      code: req.body.code.trim().toUpperCase(),
      createdBy: req.user._id,
    });
    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'CREATE_SCHOOL', schoolId: school._id, name: school.name },
    });
    res.status(201).json({ success: true, data: school });
  } catch (err) {
    next(err);
  }
};

const updateSchool = async (req, res, next) => {
  if (handleValidation(req, res)) return;
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    if (req.body.name !== undefined) school.name = req.body.name.trim();
    if (req.body.code !== undefined) school.code = req.body.code.trim().toUpperCase();
    if (req.body.isActive !== undefined) school.isActive = req.body.isActive;

    await school.save();

    if (req.body.isActive === false) {
      await Department.updateMany(
        { schoolId: school._id },
        { $set: { needsReview: true } }
      );
    }

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'UPDATE_SCHOOL', schoolId: school._id, changes: req.body },
    });

    res.json({ success: true, data: school });
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  if (handleValidation(req, res)) return;
  try {
    const school = await School.findById(req.body.schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    if (!school.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot create a department under an inactive school' });
    }

    const department = await Department.create({
      name: req.body.name.trim(),
      code: req.body.code.trim().toUpperCase(),
      schoolId: school._id,
      createdBy: req.user._id,
    });

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'CREATE_DEPARTMENT', departmentId: department._id, name: department.name, schoolId: school._id },
    });

    res.status(201).json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    if (req.body.name !== undefined) department.name = req.body.name.trim();
    if (req.body.code !== undefined) department.code = req.body.code.trim().toUpperCase();
    if (req.body.isActive !== undefined) department.isActive = req.body.isActive;
    if (req.body.needsReview !== undefined) department.needsReview = req.body.needsReview;
    if (req.body.schoolId !== undefined) {
      const school = await School.findById(req.body.schoolId);
      if (!school) return res.status(404).json({ success: false, message: 'School not found' });
      department.schoolId = school._id;
    }

    await department.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'UPDATE_DEPARTMENT', departmentId: department._id, changes: req.body },
    });

    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
};

const getAllSchools = async (req, res, next) => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json({ success: true, data: schools });
  } catch (err) {
    next(err);
  }
};

const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('schoolId', 'name code isActive')
      .sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

const getDepartmentsBySchool = async (req, res, next) => {
  try {
    const departments = await Department.find({ schoolId: req.params.schoolId });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicSchools,
  getPublicDepartments,
  getAllSchools,
  getAllDepartments,
  createSchool,
  updateSchool,
  createDepartment,
  updateDepartment,
  getDepartmentsBySchool,
};
