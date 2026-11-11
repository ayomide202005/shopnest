import Category from '../models/Category.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';

export const LOW_STOCK_THRESHOLD = 5;

// Orders in these statuses count as real sales (paid and not cancelled).
const SALES_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const RECENT_DAYS = 30;

// GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [byStatus, stockRows, categories, orderRows, refundsWaiting, recentSales] = await Promise.all([
    Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Product.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: null,
          outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', LOW_STOCK_THRESHOLD] }] }, 1, 0],
            },
          },
        },
      },
    ]),
    Category.countDocuments(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } }]),
    Order.countDocuments({ 'payment.needsRefund': true }),
    Order.aggregate([
      { $match: { status: { $in: SALES_STATUSES }, paidAt: { $gte: since } } },
      { $group: { _id: null, amount: { $sum: '$total' } } },
    ]),
  ]);

  const counts = Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count]));
  const published = counts.published ?? 0;
  const draft = counts.draft ?? 0;
  const archived = counts.archived ?? 0;
  const stock = stockRows[0] ?? { outOfStock: 0, lowStock: 0 };

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  let revenueTotal = 0;
  for (const { _id, count, amount } of orderRows) {
    ordersByStatus[_id] = count;
    if (SALES_STATUSES.includes(_id)) revenueTotal += amount;
  }

  return res.json({
    products: {
      total: published + draft + archived,
      published,
      draft,
      archived,
      outOfStock: stock.outOfStock,
      lowStock: stock.lowStock,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
    categories,
    orders: {
      total: Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: ordersByStatus,
      awaitingFulfilment: ordersByStatus.paid,
      refundsWaiting,
      revenueTotal,
      revenueRecent: recentSales[0]?.amount ?? 0,
      recentDays: RECENT_DAYS,
    },
  });
};