import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  updateCategory,
} from '../controllers/adminCategoryController.js';
import validate from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validators/adminValidators.js';

const router = Router();

router.get('/', listAdminCategories);
router.post('/', validate(createCategorySchema), createCategory);
router.patch('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', deleteCategory);

export default router;