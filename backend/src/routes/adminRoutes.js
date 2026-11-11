import { Router } from 'express';
import { getAdminStats } from '../controllers/adminStatsController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import adminCategoryRoutes from './adminCategoryRoutes.js';
import adminOrderRoutes from './adminOrderRoutes.js';
import adminProductRoutes from './adminProductRoutes.js';
import adminUploadRoutes from './adminUploadRoutes.js';

const router = Router();

// Every route below this line requires a signed-in admin. Set once, here.
router.use(adminLimiter, requireAuth, requireAdmin);

router.get('/stats', getAdminStats);
router.use('/uploads', adminUploadRoutes);
router.use('/products', adminProductRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/orders', adminOrderRoutes);

export default router;