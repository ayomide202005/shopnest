import mongoose from 'mongoose';
import { DELIVERY_FEE_KOBO, MAX_UNPAID_ORDERS, PAYMENT_GRACE_MINUTES, PAYMENT_WINDOW_MINUTES } from '../config/shop.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { getStoredItems } from './cartService.js';

const httpError = (statusCode, message, errorCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
};

const cartChanged = (message) => httpError(409, message, 'CART_CHANGED');

// Builds an order from the customer's SAVED cart. Everything happens in one transaction:
// either the stock is reserved, the order is saved and the cart is emptied, or nothing changes.
export async function createOrder({ user, shippingAddress, notes }) {
  const items = await getStoredItems(user._id);
  if (items.length === 0) throw httpError(400, 'Your cart is empty.');

  const unpaid = await Order.countDocuments({
    user: user._id,
    status: 'pending_payment',
    expiresAt: { $gt: new Date() },
  });
  if (unpaid >= MAX_UNPAID_ORDERS) {
    throw httpError(
      409,
      'You have unpaid orders. Please pay for or cancel them before placing a new one.',
      'TOO_MANY_UNPAID_ORDERS',
    );
  }

  let created = null;

  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        created = null;

        const products = await Product.find({
          _id: { $in: items.map((item) => item.productId) },
          status: 'published',
        }).session(session);
        const byId = new Map(products.map((product) => [String(product._id), product]));

        const lines = [];
        for (const { productId, quantity } of items) {
          const product = byId.get(productId);
          if (!product) throw cartChanged('An item in your cart is no longer available. Please review your cart.');
          if (product.stock === 0) throw cartChanged(`"${product.name}" is out of stock. Please review your cart.`);
          if (product.stock < quantity) {
            throw cartChanged(`Only ${product.stock} of "${product.name}" left. Please review your cart.`);
          }

          // Takes the stock only if it is still there at this exact moment.
          const reserved = await Product.updateOne(
            { _id: product._id, status: 'published', stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { session },
          );
          if (reserved.modifiedCount !== 1) {
            throw cartChanged(`"${product.name}" just sold out. Please review your cart.`);
          }

          lines.push({
            product: product._id,
            name: product.name,
            slug: product.slug,
            image: product.images?.[0]?.url ?? '',
            unitPrice: product.price,
            quantity,
            lineTotal: product.price * quantity,
          });
        }

        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

        const [order] = await Order.create(
          [
            {
              orderNumber: generateOrderNumber(),
              user: user._id,
              items: lines,
              shippingAddress: { landmark: '', ...shippingAddress },
              notes: notes ?? '',
              subtotal,
              deliveryFee: DELIVERY_FEE_KOBO,
              total: subtotal + DELIVERY_FEE_KOBO,
              status: 'pending_payment',
              expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
            },
          ],
          { session },
        );

        await Cart.updateOne({ user: user._id }, { $set: { items: [] } }, { session });
        created = order;
      });
    } catch (error) {
      // Extremely rare: the random order number already exists. Try again with a new one.
      if (error.code === 11000 && attempt < 2) continue;
      throw error;
    } finally {
      await session.endSession();
    }
  }

  return created;
}

// Cancels an order that is still waiting for payment and puts its stock back.
// "filter" says which order (for example { _id, user }). Returns the order, or null if it was
// not waiting for payment (already paid, cancelled, or not found). Safe to call twice: the
// stock is returned exactly once.
export async function cancelPendingOrder(filter, reason) {
  const session = await mongoose.startSession();
  let cancelled = null;

  try {
    await session.withTransaction(async () => {
      cancelled = null;

      const order = await Order.findOneAndUpdate(
        { ...filter, status: 'pending_payment' },
        { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason } },
        { returnDocument: 'after', session },
      );
      if (!order) return;

      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
      cancelled = order;
    });
  } finally {
    await session.endSession();
  }

  return cancelled;
}

// Cancels unpaid orders whose payment window (plus a short grace period) has passed.
// The grace period covers a customer who is paying right at the deadline.
export async function releaseExpiredOrders() {
  const cutoff = new Date(Date.now() - PAYMENT_GRACE_MINUTES * 60 * 1000);
  const expired = await Order.find({ status: 'pending_payment', expiresAt: { $lte: cutoff } })
    .select('_id')
    .limit(100)
    .lean();

  let released = 0;
  for (const { _id } of expired) {
    const order = await cancelPendingOrder({ _id, expiresAt: { $lte: cutoff } }, 'Payment was not completed in time.');
    if (order) released += 1;
  }
  return released;
}