import { Router } from 'express';
import { uploadProductImages } from '../controllers/uploadController.js';
import uploadImages from '../middleware/uploadImages.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/images', uploadLimiter, uploadImages, uploadProductImages);

export default router;