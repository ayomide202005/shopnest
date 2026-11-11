import { Router } from 'express';
import {
  getAdminOrder,
  listAdminOrders,
  resolveRefund,
  updateOrderStatus,
} from '../controllers/adminOrderController.js';
import validate, { validateQuery } from '../middleware/validate.js';
import {
  adminOrdersQuerySchema,
  resolveRefundSchema,
  updateOrderStatusSchema,
} from '../validators/adminOrderValidators.js';

const router = Router();

router.get('/', validateQuery(adminOrdersQuerySchema), listAdminOrders);
router.get('/:id', getAdminOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/:id/refund-resolved', validate(resolveRefundSchema), resolveRefund);

export default router;