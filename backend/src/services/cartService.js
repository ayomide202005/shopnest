import { DELIVERY_FEE_KOBO } from '../config/shop.js';
import Cart, { MAX_CART_LINES, MAX_LINE_QUANTITY } from '../models/Cart.js';
import Product from '../models/Product.js';

// Joins duplicate products, caps quantities and the number of lines.
export const normalizeItems = (items) => {
  const merged = new Map();
  for (const { productId, quantity } of items) {
    const key = String(productId).toLowerCase();
    merged.set(key, Math.min((merged.get(key) ?? 0) + quantity, MAX_LINE_QUANTITY));
  }
  return [...merged].slice(0, MAX_CART_LINES).map(([productId, quantity]) => ({ productId, quantity }));
};

// Turns [{ productId, quantity }] into a priced cart using CURRENT data from the database.
// Each line gets an "issue" if it cannot be bought as requested:
//   unavailable        - deleted, draft or archived
//   out_of_stock       - stock is 0
//   insufficient_stock - more requested than available
// Lines with an issue are not counted in the subtotal.
export const resolveCart = async (items) => {
  const products = items.length
    ? await Product.find({ _id: { $in: items.map((item) => item.productId) }, status: 'published' })
        .select('name slug price stock images')
        .lean()
    : [];
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const lines = items.map(({ productId, quantity }) => {
    const product = byId.get(productId);

    if (!product) {
      return {
        productId,
        name: 'No longer available',
        slug: null,
        image: null,
        price: 0,
        quantity,
        stock: 0,
        issue: 'unavailable',
        lineTotal: 0,
      };
    }

    let issue = null;
    if (product.stock === 0) issue = 'out_of_stock';
    else if (quantity > product.stock) issue = 'insufficient_stock';

    return {
      productId,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.url ?? null,
      price: product.price, // kobo
      quantity,
      stock: product.stock,
      issue,
      lineTotal: issue ? 0 : product.price * quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0); // kobo

  return {
    items: lines,
    subtotal,
    deliveryFee: DELIVERY_FEE_KOBO,
    total: subtotal + DELIVERY_FEE_KOBO,
    hasIssues: lines.some((line) => line.issue !== null),
  };
};

export const getStoredItems = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).lean();
  return (cart?.items ?? []).map((item) => ({ productId: String(item.product), quantity: item.quantity }));
};

export const saveItems = async (userId, items) => {
  const update = {
    $set: { items: items.map(({ productId, quantity }) => ({ product: productId, quantity })) },
  };
  try {
    await Cart.updateOne({ user: userId }, update, { upsert: true, runValidators: true });
  } catch (error) {
    // Two first-time saves at the same moment: the second one simply updates the first one's cart.
    if (error.code !== 11000) throw error;
    await Cart.updateOne({ user: userId }, update, { runValidators: true });
  }
};