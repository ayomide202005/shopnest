import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { deleteImage } from '../services/imageService.js';
import { isObjectId } from '../utils/objectId.js';
import { buildPagination } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const fieldError = (res, field, message) =>
  res.status(400).json({ message: 'Please correct the highlighted fields.', errors: { [field]: message } });

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  stock_asc: { stock: 1, _id: 1 }, // lowest stock first
};

// The admin sees everything, including image ids (needed to manage images).
const toAdminProduct = (product) => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price, // in kobo
  stock: product.stock,
  status: product.status,
  category: product.category?.name
    ? { id: product.category._id, name: product.category.name, slug: product.category.slug }
    : null,
  images: (product.images ?? []).map(({ url, publicId }) => ({ url, publicId })),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

// Deletes images from Cloudinary unless another product still uses them. Failures are logged, not fatal.
const removeUnusedImages = async (publicIds, productId) => {
  for (const publicId of publicIds) {
    try {
      const usedElsewhere = await Product.exists({ _id: { $ne: productId }, 'images.publicId': publicId });
      if (!usedElsewhere) await deleteImage(publicId);
    } catch (error) {
      console.error(`Could not delete image "${publicId}" from Cloudinary:`, error.message);
    }
  }
};

// GET /api/admin/products
export const listAdminProducts = async (req, res) => {
  const { page, limit, search, status, category, sort } = res.locals.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
    filter.$and = words.map((word) => ({ name: new RegExp(escapeRegex(word), 'i') }));
  }

  const query = Product.find(filter)
    .sort(SORTS[sort])
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category', 'name slug');

  if (sort === 'name_asc') query.collation({ locale: 'en', strength: 2 });

  const [products, total] = await Promise.all([query, Product.countDocuments(filter)]);

  return res.json({
    products: products.map(toAdminProduct),
    pagination: buildPagination(page, limit, total),
  });
};

// GET /api/admin/products/:id
export const getAdminProduct = async (req, res) => {
  const { id } = req.params;
  const product = isObjectId(id) ? await Product.findById(id).populate('category', 'name slug') : null;
  if (!product) throw httpError(404, 'Product not found.');
  return res.json({ product: toAdminProduct(product) });
};

// POST /api/admin/products
export const createProduct = async (req, res) => {
  const data = req.body; // only validated fields get here

  if (!(await Category.exists({ _id: data.category }))) {
    return fieldError(res, 'category', 'Choose a valid category.');
  }
  if (data.status === 'published' && (data.images ?? []).length === 0) {
    return fieldError(res, 'images', 'Add at least one image before publishing.');
  }

  const product = await Product.create(data);
  await product.populate('category', 'name slug');

  return res.status(201).json({ product: toAdminProduct(product) });
};

// PATCH /api/admin/products/:id
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const product = isObjectId(id) ? await Product.findById(id) : null;
  if (!product) throw httpError(404, 'Product not found.');

  const updates = req.body;

  if (updates.category && String(updates.category) !== String(product.category)) {
    if (!(await Category.exists({ _id: updates.category }))) {
      return fieldError(res, 'category', 'Choose a valid category.');
    }
  }

  const previousImageIds = product.images.map((image) => image.publicId);

  product.set(updates);

  if (product.status === 'published' && product.images.length === 0) {
    return fieldError(res, 'images', 'Add at least one image before publishing.');
  }

  await product.save();

  if (updates.images) {
    const keptIds = new Set(product.images.map((image) => image.publicId));
    await removeUnusedImages(
      previousImageIds.filter((publicId) => !keptIds.has(publicId)),
      product._id,
    );
  }

  await product.populate('category', 'name slug');
  return res.json({ product: toAdminProduct(product) });
};

// DELETE /api/admin/products/:id
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = isObjectId(id) ? await Product.findById(id) : null;
  if (!product) throw httpError(404, 'Product not found.');

  const publicIds = product.images.map((image) => image.publicId);
  await product.deleteOne();
  await removeUnusedImages(publicIds, product._id);

  return res.json({ message: 'Product deleted.' });
};