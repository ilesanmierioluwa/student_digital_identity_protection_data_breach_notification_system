const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { userIdParamValidator } = require('../middleware/validators');
const {
  getMyProfile,
  updateMyProfile,
  uploadDocuments,
  getMyProfileChanges,
} = require('../controllers/studentController');

router.use(protect, authorize('student'));

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.get('/profile/changes', getMyProfileChanges);
router.post('/documents', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idDocument', maxCount: 1 }]), uploadDocuments);

module.exports = router;
