const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { paginationValidators } = require('../middleware/validators');
const {
  listDepartmentStudents,
  getStudentRecord,
  listPendingProfileChanges,
  reviewProfileChange,
  verifyStudentProfile,
} = require('../controllers/officerController');

router.use(protect, authorize('officer'));

router.get('/students', paginationValidators, listDepartmentStudents);
router.get('/students/:id', getStudentRecord);
router.post('/students/:id/verify', verifyStudentProfile);
router.get('/profile-changes/pending', listPendingProfileChanges);
router.post('/profile-changes/:id/review', reviewProfileChange);

module.exports = router;
