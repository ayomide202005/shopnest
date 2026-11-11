import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

export const NEXT_STATUSES = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Cancels an already-paid order: stock goes back on sale and the order is flagged for refund.
// All or nothing. Returns the updated order, or null if its status changed in the meantime.
export async function cancelPaidOrder({ orderId, fromStatus, adminName, note }) {
  const session = await mongoose.startSession();
  let cancelled = null;

  try {
    await session.withTransaction(async () => {
      cancelled = null;
      const now = new Date();

      const order = await Order.findOneAndUpdate(
        { _id: orderId, status: fromStatus },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: now,
            cancelReason: note || 'Cancelled by the store after payment.',
            'payment.needsRefund': true,
            'payment.refundReason': 'The store cancelled this order after it was paid. Refund the customer.',
          },
          $push: { statusHistory: { status: 'cancelled', at: now, byName: adminName, note: note ?? '' } },
        },
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