import multer from 'multer';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES_PER_UPLOAD = 6;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const upload = multer({
  storage: multer.memoryStorage(), // files stay in memory and go straight to Cloudinary
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter(req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(httpError(400, 'Only JPG, PNG and WebP images are allowed.'));
    }
    return callback(null, true);
  },
});

// Reads up to 6 files from the form field "images" and turns upload errors into clear messages.
export default function uploadImages(req, res, next) {
  upload.array('images', MAX_FILES_PER_UPLOAD)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(httpError(413, 'Each image must be 5 MB or smaller.'));
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
        return next(httpError(400, `You can upload up to ${MAX_FILES_PER_UPLOAD} images at a time, in the "images" field.`));
      }
      return next(httpError(400, 'The upload could not be read.'));
    }

    return next(error);
  });
}