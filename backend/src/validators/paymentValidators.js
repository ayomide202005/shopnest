import { z } from 'zod';

export const verifyPaymentSchema = z.object({
  reference: z
    .string({ error: 'Payment reference is required' })
    .trim()
    .min(8, 'Invalid payment reference')
    .max(100, 'Invalid payment reference')
    .regex(/^[A-Za-z0-9._=-]+$/, 'Invalid payment reference'),
});