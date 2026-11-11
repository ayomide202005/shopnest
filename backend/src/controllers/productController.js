import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { escapeRegex } from '../utils/regex.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
};

// Only fields that are safe for the public. Cloudinary IDs and internal data stay hidden.
const toPublicProduct = (product, { withDescription = false } = {}) => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  price: product.price, // in kobo
  stock: product.stock,
  inStock: product.stock > 0,
  images: (product.images ?? []).map((image) => ({ url: image.url })),
  category: product.category
    ? { id: product.category._id, name: product.category.name, slug: product.category.slug }
    : null,
  createdAt: product.createdAt,
  ...(withDescription && { description: product.description }),
});

const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
};

// GET /api/products
export const listProducts = async (req, res) => {
  const { page, limit, search, category, minPrice, maxPrice, sort, inStock } = res.locals.query;

  const filter = { status: 'published' };

  if (category) {
    const found = await Category.findOne({ slug: category }).select('_id').lean();
    if (!found) {
      return res.json({ products: [], pagination: buildPagination(page, limit, 0) });
    }
    filter.category = found._id;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  if (inStock === 'true') {
    filter.stock = { $gt: 0 };
  }

  if (search) {
    // Every word must appear in the name or description (any order, ignoring capitals).
    const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
    filter.$and = words.map((word) => {
      const pattern = new RegExp(escapeRegex(word), 'i');
      return { $or: [{ name: pattern }, { description: pattern }] };
    });
  }

  const query = Product.find(filter)
    .sort(SORTS[sort])
    .skip((page - 1) * limit)
    .limit(limit)
    .select('name slug price stock images category createdAt')
    .populate('category', 'name slug')
    .lean();

  if (sort === 'name_asc') {
    query.collation({ locale: 'en', strength: 2 }); // A and a sort together
  }

  const [products, total] = await Promise.all([query, Product.countDocuments(filter)]);

  return res.json({
    products: products.map((product) => toPublicProduct(product)),
    pagination: buildPagination(page, limit, total),
  });
};

// GET /api/products/:slug
export const getProduct = async (req, res) => {
  const { slug } = req.params;

  const product = /^[a-z0-9-]{1,100}$/.test(slug)
    ? await Product.findOne({ slug, status: 'published' }).populate('category', 'name slug').lean()
    : null;

  if (!product) {
    throw httpError(404, 'Product not found.');
  }

  return res.json({ product: toPublicProduct(product, { withDescription: true }) });
};