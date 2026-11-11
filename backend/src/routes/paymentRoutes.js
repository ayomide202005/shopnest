import { Router } from 'express';
import { paystackWebhook, verifyPayment } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';
import { paymentLimiter, webhookLimiter } from '../middleware/rateLimiters.js';
import validate from '../middleware/validate.js';
import { verifyPaymentSchema } from '../validators/paymentValidators.js';

const router = Router();

// Called by Paystack: no cookie, protected by its signature instead.
router.post('/webhook', webhookLimiter, paystackWebhook);

// Called by the customer's browser.
router.post('/verify', paymentLimiter, requireAuth, validate(verifyPaymentSchema), verifyPayment);

export default router;