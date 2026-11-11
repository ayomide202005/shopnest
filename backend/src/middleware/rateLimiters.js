import { rateLimit } from 'express-rate-limit';

const createLimiter = ({ windowMinutes, limit, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });

// Wrong passwords are counted; successful logins are not.
export const loginLimiter = createLimiter({
  windowMinutes: 15,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const signupLimiter = createLimiter({
  windowMinutes: 60,
  limit: 10,
  message: 'Too many sign-up attempts. Please try again later.',
});

// Used for routes that send an email (resend verification, forgot password).
export const emailLimiter = createLimiter({
  windowMinutes: 15,
  limit: 5,
  message: 'Too many requests. Please wait a few minutes and try again.',
});

// General cap for the remaining auth routes.
export const authLimiter = createLimiter({
  windowMinutes: 15,
  limit: 100,
  message: 'Too many requests. Please try again later.',
});


// Public read-only browsing (product lists, product details, categories).
export const publicLimiter = createLimiter({
  windowMinutes: 15,
  limit: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});


// All /api/admin routes.
export const adminLimiter = createLimiter({
  windowMinutes: 15,
  limit: 600,
  message: 'Too many requests. Please try again shortly.',
});

// Image uploads are the most expensive admin action.
export const uploadLimiter = createLimiter({
  windowMinutes: 15,
  limit: 60,
  message: 'Too many uploads. Please try again in a few minutes.',
});


// Cart reads and changes. Higher than most because shoppers click +/- often.
export const cartLimiter = createLimiter({
  windowMinutes: 15,
  limit: 600,
  message: 'Too many requests. Please slow down and try again shortly.',
});


// All /api/orders routes.
export const orderLimiter = createLimiter({
  windowMinutes: 15,
  limit: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});

// Placing orders is the most sensitive customer action.
export const orderCreateLimiter = createLimiter({
  windowMinutes: 15,
  limit: 20,
  message: 'Too many order attempts. Please wait a few minutes and try again.',
});


// Confirming a payment calls Paystack, so it is limited.
export const paymentLimiter = createLimiter({
  windowMinutes: 15,
  limit: 30,
  message: 'Too many requests. Please wait a few minutes and try again.',
});

// Paystack's own calls. Generous, because the signature is what protects this route.
export const webhookLimiter = createLimiter({
  windowMinutes: 15,
  limit: 1000,
  message: 'Too many requests.',
});