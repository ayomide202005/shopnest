import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { isObjectId } from '../utils/objectId.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const NAME_TAKEN = 'A category with this name already exists.';

const toAdminCategory = (category, counts = { total: 0, published: 0 }) => ({
  id: category._id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  productCount: counts.total,
  publishedCount: counts.published,
});

const findCategory = async (id) => (isObjectId(id) ? Category.findById(id) : null);

// GET /api/admin/categories
export const listAdminCategories = async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean(),
    Product.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const countById = new Map(counts.map((entry) => [String(entry._id), entry]));

  return res.json({
    categories: categories.map((category) => toAdminCategory(category, countById.get(String(category._id)))),
  });
};

// POST /api/admin/categories
export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json({ category: toAdminCategory(category) });
  } catch (error) {
    if (error.code === 11000) throw httpError(409, NAME_TAKEN);
    throw error;
  }
};

// PATCH /api/admin/categories/:id  (the slug stays the same, so links keep working)
export const updateCategory = async (req, res) => {
  const category = await findCategory(req.params.id);
  if (!category) throw httpError(404, 'Category not found.');

  category.set(req.body);

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) throw httpError(409, NAME_TAKEN);
    throw error;
  }

  return res.json({ category: toAdminCategory(category) });
};

// DELETE /api/admin/categories/:id
export const deleteCategory = async (req, res) => {
  const category = await findCategory(req.params.id);
  if (!category) throw httpError(404, 'Category not found.');

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw httpError(
      409,
      `This category still has ${productCount} product${productCount === 1 ? '' : 's'}. Move or delete them first.`,
    );
  }

  await category.deleteOne();
  return res.json({ message: 'Category deleted.' });
};