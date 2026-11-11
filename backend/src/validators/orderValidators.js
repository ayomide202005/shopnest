import { z } from 'zod';
import { NIGERIAN_STATES } from '../config/nigerianStates.js';

const text = (label, min, max) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const NIGERIAN_PHONE = /^(\+234|234|0)[789][01]\d{8}$/;

const phone = z
  .string({ error: 'Phone number is required' })
  .trim()
  .refine(
    (value) => NIGERIAN_PHONE.test(value.replace(/[\s-]/g, '')),
    'Enter a valid Nigerian phone number, for example 08012345678',
  )
  .transform((value) => value.replace(/[\s-]/g, ''));

const shippingAddress = z.object(
  {
    fullName: text('Full name', 2, 100),
    phone,
    street: text('Street address', 5, 200),
    city: text('City', 2, 80),
    state: z.enum(NIGERIAN_STATES, { error: 'Choose your state' }),
    landmark: z.string().trim().max(150, 'Landmark must be at most 150 characters').optional(),
  },
  { error: 'Delivery address is required' },
);

// Only the address and a note are accepted. Items, prices, totals and status are never read
// from the browser: the server builds the order from the saved cart.
export const createOrderSchema = z.object({
  shippingAddress,
  notes: z.string().trim().max(300, 'Notes must be at most 300 characters').optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});