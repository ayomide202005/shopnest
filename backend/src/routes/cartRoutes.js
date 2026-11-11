import { Router } from 'express';
import { getCart, mergeCart, previewCart, replaceCart } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';
import { cartLimiter } from '../middleware/rateLimiters.js';
import validate from '../middleware/validate.js';
import { cartSchema } from '../validators/cartValidators.js';

const router = Router();

router.use(cartLimiter);

// Public: guests can price their cart.
router.post('/preview', validate(cartSchema), previewCart);

// Everything below needs a signed-in user.
router.use(requireAuth);
router.get('/', getCart);
router.put('/', validate(cartSchema), replaceCart);
router.post('/merge', validate(cartSchema), mergeCart);

export default router;