import Category from '../models/Category.js';
import Product from '../models/Product.js';

// GET /api/categories
export const listCategories = async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean(),
    Product.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const countById = new Map(counts.map((entry) => [String(entry._id), entry.count]));

  return res.json({
    categories: categories.map((category) => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: countById.get(String(category._id)) ?? 0,
    })),
  });
};