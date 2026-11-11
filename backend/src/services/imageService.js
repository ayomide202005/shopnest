import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

export const PRODUCT_IMAGE_FOLDER = 'shopnest/products';

let configured = false;

const ensureConfigured = () => {
  if (!env.cloudinary) {
    const error = new Error('Image uploads are not configured on the server.');
    error.statusCode = 503;
    throw error;
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
};

// Uploads one image buffer. Returns { url, publicId }.
export const uploadImageBuffer = (buffer) => {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: PRODUCT_IMAGE_FOLDER,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

// Returns true if the image was deleted.
export const deleteImage = async (publicId) => {
  ensureConfigured();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return result.result === 'ok';
};