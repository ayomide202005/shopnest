import { z } from 'zod';

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email({ error: 'Enter a valid email address' }));

const newPassword = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long');

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters');

const token = z
  .string({ error: 'Token is required' })
  .regex(/^[a-f0-9]{64}$/, 'This link is invalid or has expired');

export const signupSchema = z.object({ name, email, password: newPassword });

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

const emailOnlySchema = z.object({ email });
export const resendVerificationSchema = emailOnlySchema;
export const forgotPasswordSchema = emailOnlySchema;

export const verifyEmailSchema = z.object({ token });
export const resetPasswordSchema = z.object({ token, password: newPassword });