const { body, param, query } = require('express-validator');

const registerValidators = [
  body('fullName').trim().isLength({ min: 3, max: 120 }).withMessage('Full name must be 3–120 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('matricNumber').trim().isLength({ min: 5, max: 30 }).withMessage('Valid matric number required').matches(/^[a-zA-Z0-9/\\-]+$/).withMessage('Matric number contains invalid characters'),
  body('departmentId').isMongoId().withMessage('A valid department is required'),
  body('level').optional().isIn(['ND1', 'ND2', 'HND1', 'HND2']).withMessage('Invalid level'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/[a-z]/).withMessage('Password must contain a lowercase letter').matches(/[A-Z]/).withMessage('Password must contain an uppercase letter').matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidators = [
  body('email').optional().trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric().withMessage('OTP must be numeric'),
  body('purpose').isIn(['register', 'login', 'reset']).withMessage('Invalid OTP purpose'),
];

const resendOtpValidators = [
  body('email').optional().trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('purpose').isIn(['register', 'login', 'reset']).withMessage('Invalid OTP purpose'),
];

const schoolValidators = [
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('School name must be 3–120 characters'),
  body('code').trim().isLength({ min: 2, max: 12 }).withMessage('School code must be 2–12 characters').matches(/^[a-zA-Z0-9_-]+$/).withMessage('School code contains invalid characters'),
];

const departmentValidators = [
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Department name must be 3–120 characters'),
  body('code').trim().isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Department code contains invalid characters'),
  body('schoolId').isMongoId().withMessage('A valid school is required'),
];

const officerValidators = [
  body('fullName').trim().isLength({ min: 3, max: 120 }).withMessage('Full name must be 3–120 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('departmentId').isMongoId().withMessage('A valid department is required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const csvImportValidators = [];

const idParamValidator = [param('id').isMongoId().withMessage('Invalid id')];
const userIdParamValidator = [param('userId').isMongoId().withMessage('Invalid user id')];

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
];

module.exports = {
  registerValidators,
  loginValidators,
  otpValidators,
  resendOtpValidators,
  schoolValidators,
  departmentValidators,
  officerValidators,
  csvImportValidators,
  idParamValidator,
  userIdParamValidator,
  paginationValidators,
};
