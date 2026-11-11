import { z } from 'zod';
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from '../models/Cart.js';

const item = z.object({
  productId: z.string({ error: 'Invalid product' }).regex(/^[a-f0-9]{24}$/i, 'Invalid product'),
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(MAX_LINE_QUANTITY, `You can order at most ${MAX_LINE_QUANTITY} of one product`),
});

// Unknown fields (such as a price sent by the browser) are stripped and never used.
export const cartSchema = z.object({
  items: z
    .array(item, { error: 'Items must be a list' })
    .max(MAX_CART_LINES, `A cart can hold at most ${MAX_CART_LINES} different products`),
});