const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { officerValidators, paginationValidators } = require('../middleware/validators');
const {
  listStudents,
  createStudent,
  listOfficers,
  createOfficer,
  importStudentsCsv,
  setStudentActive,
  listSchoolsAndDepartments,
} = require('../controllers/adminController');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

router.use(protect, authorize('admin'));

router.get('/structure', listSchoolsAndDepartments);
router.get('/students', paginationValidators, listStudents);
router.post('/students', createStudent);
router.post('/students/import', csvUpload.single('file'), importStudentsCsv);
router.put('/students/:id/active', setStudentActive);
router.get('/officers', paginationValidators, listOfficers);
router.post('/officers', officerValidators, createOfficer);

module.exports = router;
