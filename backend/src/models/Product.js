import mongoose from 'mongoose';
import { generateUniqueSlug } from '../utils/slug.js';

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'];
export const MAX_PRODUCT_IMAGES = 6;

const isWholeNumber = {
  validator: Number.isInteger,
  message: '{PATH} must be a whole number',
};

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary ID, needed to delete the image later
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [120, 'Product name must be at most 120 characters'],
    },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description must be at most 5000 characters'],
      default: '',
    },
    // Price in the smallest currency unit (kobo): 1500000 means N15,000.00
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be greater than zero'],
      validate: isWholeNumber,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (images) => images.length <= MAX_PRODUCT_IMAGES,
        message: `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: isWholeNumber,
    },
    status: {
      type: String,
      enum: { values: PRODUCT_STATUSES, message: 'Status must be draft, published or archived' },
      default: 'draft',
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

productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, price: 1 });

// The slug is created once and then stays stable, so old links keep working after a rename.
productSchema.pre('validate', async function () {
  if (!this.slug) {
    this.slug = await generateUniqueSlug(this.constructor, this.name, this._id);
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;