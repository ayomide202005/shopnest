import { z } from 'zod';
import { env } from '../config/env.js';
import { MAX_PRODUCT_IMAGES, PRODUCT_STATUSES } from '../models/Product.js';

const objectId = z.string({ error: 'Invalid id' }).regex(/^[a-f0-9]{24}$/i, 'Invalid id');

// Images may only come from this project's own Cloudinary account.
const imageUrlPrefix = env.cloudinary ? `https://res.cloudinary.com/${env.cloudinary.cloudName}/` : null;

const image = z.object({
  url: z
    .string({ error: 'Image URL is required' })
    .max(500)
    .refine((url) => imageUrlPrefix !== null && url.startsWith(imageUrlPrefix), 'Upload the image through ShopNest first'),
  publicId: z
    .string({ error: 'Image id is required' })
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_\-./]+$/, 'Invalid image id'),
});

const images = z
  .array(image, { error: 'Images must be a list' })
  .max(MAX_PRODUCT_IMAGES, `A product can have at most ${MAX_PRODUCT_IMAGES} images`)
  .refine((list) => new Set(list.map((item) => item.publicId)).size === list.length, 'The same image was added twice');

const name = z
  .string({ error: 'Product name is required' })
  .trim()
  .min(3, 'Product name must be at least 3 characters')
  .max(120, 'Product name must be at most 120 characters');

const description = z
  .string({ error: 'Description must be text' })
  .trim()
  .max(5000, 'Description must be at most 5000 characters');

// Money is a whole number of kobo: 1500000 means N15,000.00
const price = z
  .number({ error: 'Price must be a number' })
  .int('Price must be a whole number (in kobo)')
  .min(1, 'Price must be greater than zero')
  .max(10_000_000_000, 'Price is too large');

const stock = z
  .number({ error: 'Stock must be a number' })
  .int('Stock must be a whole number')
  .min(0, 'Stock cannot be negative')
  .max(1_000_000, 'Stock is too large');

const status = z.enum(PRODUCT_STATUSES, { error: 'Status must be draft, published or archived' });

const categoryId = z.string({ error: 'Category is required' }).regex(/^[a-f0-9]{24}$/i, 'Choose a valid category');

export const createProductSchema = z.object({
  name,
  price,
  category: categoryId,
  description: description.optional(),
  stock: stock.optional(),
  status: status.optional(),
  images: images.optional(),
});

export const updateProductSchema = z
  .object({
    name: name.optional(),
    price: price.optional(),
    category: categoryId.optional(),
    description: description.optional(),
    stock: stock.optional(),
    status: status.optional(),
    images: images.optional(),
  })
  .refine((updates) => Object.keys(updates).length > 0, 'Send at least one field to update');

export const adminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  category: objectId.optional(),
  sort: z.enum(['newest', 'oldest', 'name_asc', 'price_asc', 'price_desc', 'stock_asc']).default('newest'),
});

const categoryName = z
  .string({ error: 'Category name is required' })
  .trim()
  .min(2, 'Category name must be at least 2 characters')
  .max(50, 'Category name must be at most 50 characters');

const categoryDescription = z
  .string({ error: 'Description must be text' })
  .trim()
  .max(300, 'Description must be at most 300 characters');

export const createCategorySchema = z.object({
  name: categoryName,
  description: categoryDescription.optional(),
});

export const updateCategorySchema = z
  .object({
    name: categoryName.optional(),
    description: categoryDescription.optional(),
  })
  .refine((updates) => Object.keys(updates).length > 0, 'Send at least one field to update');