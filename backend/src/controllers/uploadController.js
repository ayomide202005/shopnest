import { detectImageType } from '../utils/imageType.js';
import { deleteImage, uploadImageBuffer } from '../services/imageService.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// POST /api/admin/uploads/images  (admin only)
export const uploadProductImages = async (req, res) => {
  const files = req.files ?? [];

  if (files.length === 0) {
    throw httpError(400, 'Please choose at least one image.');
  }

  for (const file of files) {
    if (!detectImageType(file.buffer)) {
      throw httpError(400, `"${file.originalname.slice(0, 80)}" is not a valid JPG, PNG or WebP image.`);
    }
  }

  const results = await Promise.allSettled(files.map((file) => uploadImageBuffer(file.buffer)));
  const uploaded = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const failed = results.find((result) => result.status === 'rejected');

  if (failed) {
    console.error('Image upload failed:', failed.reason?.message ?? failed.reason);
    // Do not leave a half-finished batch behind in Cloudinary.
    await Promise.allSettled(uploaded.map((image) => deleteImage(image.publicId)));
    throw httpError(502, 'Image upload failed. Please try again.');
  }

  return res.status(201).json({ images: uploaded });
};