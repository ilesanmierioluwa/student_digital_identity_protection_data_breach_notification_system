const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { schoolValidators, departmentValidators } = require('../middleware/validators');
const {
  getPublicSchools,
  getPublicDepartments,
  getAllSchools,
  getAllDepartments,
  createSchool,
  updateSchool,
  createDepartment,
  updateDepartment,
  getDepartmentsBySchool,
} = require('../controllers/academicStructureController');

router.get('/public/schools', getPublicSchools);
router.get('/public/departments', getPublicDepartments);

router.use(protect);

router.get('/schools', authorize('admin'), getAllSchools);
router.get('/departments', authorize('admin'), getAllDepartments);
router.get('/departments/school/:schoolId', authorize('admin', 'officer'), getDepartmentsBySchool);
router.post('/schools', authorize('admin'), schoolValidators, createSchool);
router.put('/schools/:id', authorize('admin'), updateSchool);
router.post('/departments', authorize('admin'), departmentValidators, createDepartment);
router.put('/departments/:id', authorize('admin'), updateDepartment);

module.exports = router;
