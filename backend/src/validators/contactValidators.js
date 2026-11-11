import { z } from 'zod';

const text = (label, min, max) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const contactSchema = z.object({
  name: text('Name', 2, 80),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(254, 'Email is too long'),
  orderNumber: z.string().trim().max(30, 'Order number is too long').optional(),
  message: text('Message', 10, 2000),
  // A hidden field real visitors never see. Bots fill it in.
  website: z.string().max(200).optional(),
});