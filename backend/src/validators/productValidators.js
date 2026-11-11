import { z } from 'zod';

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc'];

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().toLowerCase().max(100).optional(), // category slug
    minPrice: z.coerce.number().int().min(0).optional(), // in kobo
    maxPrice: z.coerce.number().int().min(0).optional(), // in kobo
    sort: z.enum(PRODUCT_SORTS).default('newest'),
    inStock: z.enum(['true', 'false']).optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    { message: 'Minimum price cannot be greater than maximum price', path: ['minPrice'] },
  );