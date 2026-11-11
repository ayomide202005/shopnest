import { Router } from 'express';
import { listCategories } from '../controllers/categoryController.js';
import { publicLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/', publicLimiter, listCategories);

export default router;