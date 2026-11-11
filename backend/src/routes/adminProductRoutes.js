import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
} from '../controllers/adminProductController.js';
import validate, { validateQuery } from '../middleware/validate.js';
import {
  adminProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
} from '../validators/adminValidators.js';

const router = Router();

router.get('/', validateQuery(adminProductsQuerySchema), listAdminProducts);
router.post('/', validate(createProductSchema), createProduct);
router.get('/:id', getAdminProduct);
router.patch('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);

export default router;