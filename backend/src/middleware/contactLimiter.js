import rateLimit from 'express-rate-limit';

// Each message sends an email, so keep this tight: 5 per hour per visitor.
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You have sent several messages already. Please try again in an hour.' },
});