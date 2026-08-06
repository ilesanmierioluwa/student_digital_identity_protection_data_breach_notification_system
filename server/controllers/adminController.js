const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const Department = require('../models/Department');
const { writeAuditLog } = require('../middleware/auditLogger');
const logger = require('../utils/logger');

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

const listStudents = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const filter = { role: 'student' };

    if (req.query.search) {
      const term = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ fullName: term }, { matricNumber: term }, { email: term }];
    }
    if (req.query.schoolId) {
      const deptIds = await Department.find({ schoolId: req.query.schoolId }).distinct('_id');
      filter.departmentId = { $in: deptIds };
    }
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.level) filter.level = req.query.level;
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;

    const [students, total] = await Promise.all([
      User.find(filter)
        .populate('departmentId', 'name code')
        .select('fullName matricNumber email level departmentId isActive profileVerified isEmailVerified createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { students, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const { fullName, email, matricNumber, departmentId, level, password } = req.body;
    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(400).json({ success: false, message: 'Department not found' });

    const existing = await User.findOne({
      $or: [{ email: (email || '').toLowerCase() }, { matricNumber: (matricNumber || '').toUpperCase() }],
    });
    if (existing) return res.status(409).json({ success: false, message: 'Email or matric number already registered' });

    const user = await User.create({
      role: 'student',
      fullName,
      email: email.toLowerCase(),
      matricNumber: matricNumber.toUpperCase(),
      departmentId: dept._id,
      level: level || null,
      passwordHash: await bcrypt.hash(password || 'Student@1234', 12),
      isEmailVerified: true,
    });

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_ACTION',
      targetUserId: user._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'CREATE_STUDENT' },
    });

    res.status(201).json({ success: true, data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

const listOfficers = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const [officers, total] = await Promise.all([
      User.find({ role: 'officer' })
        .populate('departmentId', 'name code schoolId')
        .select('fullName email departmentId isActive mustChangePassword createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      User.countDocuments({ role: 'officer' }),
    ]);
    res.json({ success: true, data: { officers, total, page, limit, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
};

const createOfficer = async (req, res, next) => {
  try {
    const { fullName, email, departmentId } = req.body;
    const dept = await Department.findById(departmentId);
    if (!dept || !dept.isActive) {
      return res.status(400).json({ success: false, message: 'Department not found or inactive' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const user = await User.create({
      role: 'officer',
      fullName,
      email: email.toLowerCase(),
      departmentId: dept._id,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      isEmailVerified: true,
      mustChangePassword: true,
    });

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ROLE_CHANGE',
      targetUserId: user._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { operation: 'CREATE_OFFICER', departmentId: dept._id, departmentCode: dept.code },
    });

    res.status(201).json({
      success: true,
      message: 'Officer account created. Temporary password issued — officer must change it on first login.',
      data: { ...user.toSafeJSON(), tempPassword },
    });
  } catch (err) {
    next(err);
  }
};

const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    return obj;
  });
};

const importStudentsCsv = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded' });

    const rows = parseCsv(req.file.buffer.toString('utf8'));
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV is empty or malformed' });
    }

    const departments = await Department.find().lean();
    const deptByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d]));
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const fullName = row.fullname || row.full_name || row.name || '';
      const email = (row.email || '').toLowerCase();
      const matric = (row.matric || row.matricnumber || row.matric_no || '').toUpperCase();
      const deptCode = (row.department || row.dept || '').toUpperCase();
      const level = (row.level || 'ND1').toUpperCase();

      if (!fullName || !email || !matric || !deptCode) {
        results.skipped++;
        results.errors.push({ row: rows.indexOf(row) + 2, reason: 'Missing required column (fullName/email/matric/department)' });
        continue;
      }
      const dept = deptByCode.get(deptCode);
      if (!dept) {
        results.skipped++;
        results.errors.push({ row: rows.indexOf(row) + 2, matric, reason: `Unknown department code "${deptCode}"` });
        continue;
      }
      if (!dept.isActive) {
        results.skipped++;
        results.errors.push({ row: rows.indexOf(row) + 2, matric, reason: `Department "${deptCode}" is inactive` });
        continue;
      }
      const existing = await User.exists({
        $or: [{ email }, { matricNumber: matric }],
      });
      if (existing) {
        results.skipped++;
        results.errors.push({ row: rows.indexOf(row) + 2, matric, reason: 'Email or matric number already exists' });
        continue;
      }
      if (!['ND1', 'ND2', 'HND1', 'HND2'].includes(level)) {
        results.skipped++;
        results.errors.push({ row: rows.indexOf(row) + 2, matric, reason: `Invalid level "${level}"` });
        continue;
      }

      await User.create({
        role: 'student',
        fullName,
        email,
        matricNumber: matric,
        departmentId: dept._id,
        level,
        passwordHash: await bcrypt.hash('Student@1234', 12),
        isEmailVerified: true,
      });
      results.imported++;
    }

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'CSV_IMPORT',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { totalRows: rows.length, imported: results.imported, skipped: results.skipped },
    });

    logger.info(`CSV import: ${results.imported} imported, ${results.skipped} skipped`);
    res.json({
      success: true,
      message: `Import complete: ${results.imported} imported, ${results.skipped} skipped`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

const setStudentActive = async (req, res, next) => {
  try {
    const { isActive, reason } = req.body;
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.isActive = isActive;
    await student.save();

    writeAuditLog({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: isActive ? 'ACCOUNT_UNLOCKED' : 'ACCOUNT_DEACTIVATED',
      targetUserId: student._id,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      metadata: { reason: reason || (isActive ? 'reactivated' : 'deactivated'), matricNumber: student.matricNumber },
    });

    res.json({
      success: true,
      message: isActive ? 'Student account reactivated' : 'Student account deactivated (data retained)',
      data: student.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
};

const listSchoolsAndDepartments = async (req, res, next) => {
  try {
    const [schools, departments] = await Promise.all([
      School.find().sort({ name: 1 }),
      Department.find().populate('schoolId', 'name code').sort({ name: 1 }),
    ]);
    res.json({ success: true, data: { schools, departments } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStudents,
  createStudent,
  listOfficers,
  createOfficer,
  importStudentsCsv,
  setStudentActive,
  listSchoolsAndDepartments,
};
