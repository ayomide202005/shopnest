import { Router } from 'express';
import { sendContactMessage } from '../controllers/contactController.js';
import { contactLimiter } from '../middleware/contactLimiter.js';
import validate from '../middleware/validate.js';
import { contactSchema } from '../validators/contactValidators.js';

const router = Router();

router.post('/', contactLimiter, validate(contactSchema), sendContactMessage);

export default router;