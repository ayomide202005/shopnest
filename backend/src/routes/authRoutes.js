import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { authLimiter, emailLimiter, loginLimiter, signupLimiter } from '../middleware/rateLimiters.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from '../validators/authValidators.js';

const router = Router();

// Each route: rate limit first, then validate the body, then the controller.
router.post('/signup', signupLimiter, validate(signupSchema), signup);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', emailLimiter, validate(resendVerificationSchema), resendVerification);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', authLimiter, logout);
router.get('/me', authLimiter, requireAuth, me);
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;