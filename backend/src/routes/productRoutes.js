import { Router } from 'express';
import { getProduct, listProducts } from '../controllers/productController.js';
import { validateQuery } from '../middleware/validate.js';
import { publicLimiter } from '../middleware/rateLimiters.js';
import { listProductsQuerySchema } from '../validators/productValidators.js';

const router = Router();

router.get('/', publicLimiter, validateQuery(listProductsQuerySchema), listProducts);
router.get('/:slug', publicLimiter, getProduct);

export default router;