import mongoose from 'mongoose';

export const MAX_CART_LINES = 30; // different products in one cart
export const MAX_LINE_QUANTITY = 20; // of one product

// The cart only remembers WHICH products and HOW MANY. Prices come from the products themselves.
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_LINE_QUANTITY,
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('Cart', cartSchema);