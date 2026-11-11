import { z } from 'zod';
import { ORDER_STATUSES } from '../models/Order.js';

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  needsRefund: z.enum(['true']).optional(),
  sort: z.enum(['newest', 'oldest', 'total_desc', 'total_asc']).default('newest'),
});

const note = z.string({ error: 'Note must be text' }).trim().max(300, 'Note must be at most 300 characters');

// "paid" and "pending_payment" are only ever set by the payment system, never by hand.
export const updateOrderStatusSchema = z.object({
  status: z.enum(['processing', 'shipped', 'delivered', 'cancelled'], {
    error: 'Status must be processing, shipped, delivered or cancelled',
  }),
  note: note.optional(),
});

export const resolveRefundSchema = z.object({
  note: note.optional(),
});