import { Router } from 'express';
import { cancelMyOrder, getMyOrder, listMyOrders, payForOrder, placeOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';
import { orderCreateLimiter, orderLimiter } from '../middleware/rateLimiters.js';
import validate, { validateQuery } from '../middleware/validate.js';
import { createOrderSchema, listOrdersQuerySchema } from '../validators/orderValidators.js';

const router = Router();

router.use(orderLimiter, requireAuth);

router.post('/', orderCreateLimiter, validate(createOrderSchema), placeOrder);
router.get('/', validateQuery(listOrdersQuerySchema), listMyOrders);
router.get('/:id', getMyOrder);
router.post('/:id/cancel', cancelMyOrder);
router.post('/:id/pay', payForOrder);

export default router;