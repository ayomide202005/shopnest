import mongoose from 'mongoose';
import { generateUniqueSlug } from '../utils/slug.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name must be at most 50 characters'],
    },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description must be at most 300 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// "Shoes" and "shoes" are the same category.
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// The slug is created once and then stays stable, even if the name changes later.
categorySchema.pre('validate', async function () {
  if (!this.slug) {
    this.slug = await generateUniqueSlug(this.constructor, this.name, this._id);
  }
});

const Category = mongoose.model('Category', categorySchema);

export default Category;