import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { initializeTransaction, verifyTransaction } from './paystackService.js';

const MAX_PAYMENT_ATTEMPTS = 10;

const httpError = (statusCode, message, errorCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
};

class StockShortage extends Error {}

// What to write on an order when Paystack confirms the payment.
const paidUpdate = (transaction, reference) => ({
  $set: {
    status: 'paid',
    paidAt: new Date(),
    'payment.paidReference': reference,
    'payment.paidAmount': transaction.amount,
    'payment.channel': transaction.channel ?? '',
  },
  $unset: { expiresAt: 1, cancelledAt: 1, cancelReason: 1 },
});

// Money arrived but the order cannot be completed. The owner has to refund it.
async function flagForRefund(order, reference, reason) {
  console.error(`REFUND NEEDED: order ${order.orderNumber}: ${reason} (payment reference ${reference})`);
  await Order.updateOne(
    { _id: order._id },
    { $set: { 'payment.needsRefund': true, 'payment.refundReason': `${reason} (payment reference ${reference})` } },
  );
}

// A customer paid just after the order was cancelled (for example it timed out while they were
// on the payment page). If the items are still in stock, the order is brought back as paid.
async function reviveCancelledOrder(orderId, transaction, reference) {
  const session = await mongoose.startSession();
  let revived = null;

  try {
    await session.withTransaction(async () => {
      revived = null;
      const order = await Order.findOne({ _id: orderId, status: 'cancelled' }).session(session);
      if (!order) return;

      for (const item of order.items) {
        const taken = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (taken.modifiedCount !== 1) throw new StockShortage();
      }

      revived = await Order.findOneAndUpdate(
        { _id: orderId, status: 'cancelled' },
        paidUpdate(transaction, reference),
        { returnDocument: 'after', session },
      );
    });
  } catch (error) {
    if (error instanceof StockShortage) return null;
    throw error;
  } finally {
    await session.endSession();
  }

  return revived;
}

// Starts a Paystack payment for one of the customer's own unpaid orders.
// The amount is ALWAYS the order's total from the database, never anything from the browser.
export async function startPayment(order, user) {
  if (order.status !== 'pending_payment') throw httpError(409, 'This order cannot be paid.');
  if (order.expiresAt <= new Date()) {
    throw httpError(409, 'This order has expired. Please place a new order.', 'ORDER_EXPIRED');
  }
  if (order.payment.attemptedReferences.length >= MAX_PAYMENT_ATTEMPTS) {
    throw httpError(409, 'Too many payment attempts for this order. Please place a new order.');
  }

  const reference = `${order.orderNumber}-${randomBytes(4).toString('hex')}`;

  // Saved BEFORE calling Paystack, so a confirmation can always be matched to this order.
  const saved = await Order.updateOne(
    { _id: order._id, status: 'pending_payment', expiresAt: { $gt: new Date() } },
    { $push: { 'payment.attemptedReferences': reference } },
  );
  if (saved.modifiedCount !== 1) throw httpError(409, 'This order cannot be paid.');

  const transaction = await initializeTransaction({
    email: user.email,
    amount: order.total,
    reference,
    callbackUrl: `${env.clientUrls[0]}/payment/callback`,
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
  });

  return { authorizationUrl: transaction.authorization_url, reference };
}

// Asks Paystack what really happened to a payment, and updates the order to match.
// Used both when the customer returns to the site and when Paystack's webhook arrives.
// Safe to run many times, and safe if both run at the same moment.
// Pass userId to limit it to that customer's own orders.
export async function settlePayment(reference, { userId } = {}) {
  const filter = { 'payment.attemptedReferences': reference };
  if (userId) filter.user = userId;

  const order = await Order.findOne(filter);
  if (!order) throw httpError(404, 'Payment not found.');

  if (order.paidAt && order.payment.paidReference === reference) {
    return { order, outcome: 'already_paid' };
  }

  const transaction = await verifyTransaction(reference);

  if (transaction.status !== 'success') {
    const outcome = transaction.status === 'failed' || transaction.status === 'abandoned' ? transaction.status : 'pending';
    return { order, outcome };
  }

  if (transaction.amount !== order.total || transaction.currency !== 'NGN') {
    await flagForRefund(order, reference, 'The amount paid did not match the order total');
    return { order: await Order.findById(order._id), outcome: 'refund_needed' };
  }

  // The normal case: the order is waiting for payment. Only one caller can win this update.
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, status: 'pending_payment' },
    paidUpdate(transaction, reference),
    { returnDocument: 'after' },
  );
  if (paid) return { order: paid, outcome: 'paid' };

  // The order was not waiting for payment any more. Find out why.
  const current = await Order.findById(order._id);

  if (current.paidAt) {
    if (current.payment.paidReference !== reference) {
      await flagForRefund(current, reference, 'Duplicate payment: the order was already paid');
    }
    return { order: current, outcome: 'already_paid' };
  }

  if (current.status === 'cancelled') {
    const revived = await reviveCancelledOrder(current._id, transaction, reference);
    if (revived) return { order: revived, outcome: 'paid' };
    await flagForRefund(current, reference, 'Payment received after the order was cancelled, and the items are no longer in stock');
  } else {
    await flagForRefund(current, reference, 'Payment received for an order that can no longer be paid');
  }

  return { order: await Order.findById(order._id), outcome: 'refund_needed' };
}