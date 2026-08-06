const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('File type not allowed — only JPG, PNG or PDF (max 5MB)'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 2 },
  fileFilter,
});

const uploadBufferToCloudinary = (buffer, { folder = 'dspz', resourceType = 'auto' } = {}) => {
  const attempt = (n) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) {
            logger.error(`Cloudinary upload failed (attempt ${n})`, { error: error.message });
            return reject(error);
          }
          resolve(result);
        }
      );
      stream.end(buffer);
    });

  const withRetry = async (n = 1) => {
    try {
      return await attempt(n);
    } catch (err) {
      if (n >= 3) {
        throw new Error('File upload to Cloudinary failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * n));
      return withRetry(n + 1);
    }
  };

  return withRetry();
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.error('Cloudinary delete failed', { error: err.message, publicId });
  }
};

const getPublicId = (url) => {
  const match = String(url || '').match(/\/upload\/v\d+\/(.+)/);
  return match ? match[1] : null;
};

module.exports = { upload, uploadBufferToCloudinary, deleteFromCloudinary, getPublicId, ALLOWED_TYPES, MAX_SIZE };
