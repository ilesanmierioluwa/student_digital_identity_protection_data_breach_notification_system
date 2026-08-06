require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const School = require('../models/School');
const Department = require('../models/Department');
const logger = require('../utils/logger');

const ADMIN_EMAIL = 'admin@dspz.edu.ng';
const ADMIN_PASSWORD = 'Admin@1234';
const STUDENT_PASSWORD = 'Student@1234';
const OFFICER_PASSWORD = 'Officer@1234';

const SCHOOLS = [
  {
    name: 'School of Applied Sciences',
    code: 'SAS',
    departments: [
      { name: 'Computer Science', code: 'CSC' },
      { name: 'Statistics', code: 'STA' },
    ],
  },
  {
    name: 'School of Engineering Technology',
    code: 'SET',
    departments: [{ name: 'Electrical/Electronics Engineering', code: 'EEE' }],
  },
  {
    name: 'School of Business Studies',
    code: 'SBS',
    departments: [{ name: 'Accountancy', code: 'ACC' }],
  },
];

const STUDENTS = [
  { fullName: 'Adaeze Okafor', email: 'nd1.csc.001@dspz.edu.ng', matric: 'ND/2023/CSC/001', dept: 'CSC', level: 'ND1' },
  { fullName: 'Tunde Bakare', email: 'nd1.csc.002@dspz.edu.ng', matric: 'ND/2023/CSC/002', dept: 'CSC', level: 'ND1' },
  { fullName: 'Ngozi Eze', email: 'nd2.csc.003@dspz.edu.ng', matric: 'ND/2022/CSC/003', dept: 'CSC', level: 'ND2' },
  { fullName: 'Ibrahim Suleiman', email: 'nd1.sta.004@dspz.edu.ng', matric: 'ND/2023/STA/001', dept: 'STA', level: 'ND1' },
  { fullName: 'Chiamaka Nwosu', email: 'nd2.sta.005@dspz.edu.ng', matric: 'ND/2022/STA/002', dept: 'STA', level: 'ND2' },
  { fullName: 'Emeka Obi', email: 'nd1.eee.006@dspz.edu.ng', matric: 'ND/2023/EEE/001', dept: 'EEE', level: 'ND1' },
  { fullName: 'Fatima Bello', email: 'nd2.eee.007@dspz.edu.ng', matric: 'ND/2022/EEE/002', dept: 'EEE', level: 'ND2' },
  { fullName: 'Kelechi Amadi', email: 'hnd1.csc.008@dspz.edu.ng', matric: 'HND/2023/CSC/001', dept: 'CSC', level: 'HND1' },
  { fullName: 'Blessing Adeyemi', email: 'hnd1.acc.009@dspz.edu.ng', matric: 'HND/2023/ACC/001', dept: 'ACC', level: 'HND1' },
  { fullName: 'Yusuf Abdul', email: 'nd1.acc.010@dspz.edu.ng', matric: 'ND/2023/ACC/002', dept: 'ACC', level: 'ND1' },
];

const OFFICERS = [
  { fullName: 'Officer Grace Oseghale', email: 'grace.officer@dspz.edu.ng', dept: 'CSC' },
  { fullName: 'Officer Samuel Edokpayi', email: 'samuel.officer@dspz.edu.ng', dept: 'EEE' },
];

const seed = async () => {
  await connectDB();
  logger.info('Starting database seed...');

  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    await User.create({
      role: 'admin',
      fullName: 'System Administrator',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      isEmailVerified: true,
    });
    logger.info(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    logger.info('Admin already exists');
  }

  for (const sd of SCHOOLS) {
    let school = await School.findOne({ code: sd.code });
    if (!school) {
      school = await School.create({ name: sd.name, code: sd.code, createdBy: admin ? admin._id : null });
      logger.info(`School created: ${sd.name} (${sd.code})`);
    } else {
      logger.info(`School exists: ${sd.name} (${sd.code})`);
    }
    for (const dd of sd.departments) {
      let dept = await Department.findOne({ code: dd.code, schoolId: school._id });
      if (!dept) {
        await Department.create({ name: dd.name, code: dd.code, schoolId: school._id, createdBy: admin ? admin._id : null });
        logger.info(`Department created: ${dd.name} (${dd.code}) under ${sd.code}`);
      } else {
        logger.info(`Department exists: ${dd.name} (${dd.code})`);
      }
    }
  }

  for (const o of OFFICERS) {
    const dept = await Department.findOne({ code: o.dept });
    if (!dept) continue;
    const existing = await User.findOne({ email: o.email });
    if (!existing) {
      await User.create({
        role: 'officer',
        fullName: o.fullName,
        email: o.email,
        departmentId: dept._id,
        passwordHash: await bcrypt.hash(OFFICER_PASSWORD, 12),
        isEmailVerified: true,
        mustChangePassword: true,
      });
      logger.info(`Officer created: ${o.fullName} (${o.dept}) temp password: ${OFFICER_PASSWORD}`);
    } else {
      logger.info(`Officer exists: ${o.fullName}`);
    }
  }

  for (const s of STUDENTS) {
    const dept = await Department.findOne({ code: s.dept });
    if (!dept) continue;
    const existing = await User.findOne({ email: s.email });
    if (!existing) {
      await User.create({
        role: 'student',
        fullName: s.fullName,
        email: s.email,
        matricNumber: s.matric,
        departmentId: dept._id,
        level: s.level,
        passwordHash: await bcrypt.hash(STUDENT_PASSWORD, 12),
        isEmailVerified: true,
      });
      logger.info(`Student created: ${s.fullName} (${s.matric})`);
    } else {
      logger.info(`Student exists: ${s.fullName}`);
    }
  }

  logger.info('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (err) => {
  logger.error('Seed failed', { error: err.message, stack: err.stack });
  await mongoose.disconnect();
  process.exit(1);
});
