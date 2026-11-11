import Order from '../models/Order.js';
import User from '../models/User.js';
import { cancelPaidOrder, NEXT_STATUSES } from '../services/adminOrderService.js';
import { cancelPendingOrder } from '../services/orderService.js';
import { isObjectId } from '../utils/objectId.js';
import { buildPagination } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const LABELS = {
  pending_payment: 'awaiting payment',
  paid: 'paid',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  total_desc: { total: -1, _id: -1 },
  total_asc: { total: 1, _id: 1 },
};

const toAdminOrder = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  nextStatuses: NEXT_STATUSES[order.status] ?? [],
  customer: order.user?.email ? { id: order.user._id, name: order.user.name, email: order.user.email } : null,
  items: order.items.map((item) => ({
    productId: item.product,
    name: item.name,
    slug: item.slug,
    image: item.image,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  })),
  shippingAddress: {
    fullName: order.shippingAddress.fullName,
    phone: order.shippingAddress.phone,
    street: order.shippingAddress.street,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    landmark: order.shippingAddress.landmark,
  },
  notes: order.notes,
  subtotal: order.subtotal,
  deliveryFee: order.deliveryFee,
  total: order.total,
  createdAt: order.createdAt,
  paidAt: order.paidAt ?? null,
  expiresAt: order.status === 'pending_payment' ? (order.expiresAt ?? null) : null,
  cancelledAt: order.cancelledAt ?? null,
  cancelReason: order.cancelReason ?? '',
  payment: {
    reference: order.payment?.paidReference ?? null,
    paidAmount: order.payment?.paidAmount ?? null,
    channel: order.payment?.channel ?? null,
    needsRefund: Boolean(order.payment?.needsRefund),
    refundReason: order.payment?.refundReason ?? '',
    refundedAt: order.payment?.refundedAt ?? null,
    refundNote: order.payment?.refundNote ?? '',
  },
  statusHistory: (order.statusHistory ?? []).map((entry) => ({
    status: entry.status,
    at: entry.at,
    byName: entry.byName,
    note: entry.note,
  })),
});

const findOrder = async (id) => (isObjectId(id) ? Order.findById(id).populate('user', 'name email') : null);

// GET /api/admin/orders
export const listAdminOrders = async (req, res) => {
  const { page, limit, status, search, needsRefund, sort } = res.locals.query;

  const filter = {};
  if (status) filter.status = status;
  if (needsRefund === 'true') filter['payment.needsRefund'] = true;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const customers = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
      .select('_id')
      .limit(50)
      .lean();

    filter.$or = [
      { orderNumber: pattern },
      { 'shippingAddress.fullName': pattern },
      { 'shippingAddress.phone': pattern },
      { user: { $in: customers.map((customer) => customer._id) } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return res.json({ orders: orders.map(toAdminOrder), pagination: buildPagination(page, limit, total) });
};

// GET /api/admin/orders/:id
export const getAdminOrder = async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) throw httpError(404, 'Order not found.');
  return res.json({ order: toAdminOrder(order) });
};

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  const { status: next, note } = req.body;

  const order = await findOrder(req.params.id);
  if (!order) throw httpError(404, 'Order not found.');

  if (!NEXT_STATUSES[order.status].includes(next)) {
    throw httpError(409, `An order that is ${LABELS[order.status]} cannot be changed to ${LABELS[next]}.`);
  }

  const entry = { status: next, at: new Date(), byName: req.user.name, note: note ?? '' };
  let updated = null;

  if (next === 'cancelled' && order.status === 'pending_payment') {
    const cancelled = await cancelPendingOrder({ _id: order._id }, note || 'Cancelled by the store.');
    if (cancelled) {
      await Order.updateOne({ _id: order._id }, { $push: { statusHistory: entry } });
      updated = await findOrder(req.params.id);
    }
  } else if (next === 'cancelled') {
    updated = await cancelPaidOrder({
      orderId: order._id,
      fromStatus: order.status,
      adminName: req.user.name,
      note,
    });
    if (updated) await updated.populate('user', 'name email');
  } else {
    updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: next }, $push: { statusHistory: entry } },
      { returnDocument: 'after' },
    );
    if (updated) await updated.populate('user', 'name email');
  }

  if (!updated) throw httpError(409, 'This order was changed a moment ago. Please reload it and try again.');

  return res.json({ order: toAdminOrder(updated) });
};

// POST /api/admin/orders/:id/refund-resolved
export const resolveRefund = async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) throw httpError(404, 'Order not found.');

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, 'payment.needsRefund': true },
    {
      $set: {
        'payment.needsRefund': false,
        'payment.refundedAt': new Date(),
        'payment.refundNote': req.body.note ?? '',
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw httpError(409, 'This order is not waiting for a refund.');

  await updated.populate('user', 'name email');
  return res.json({ order: toAdminOrder(updated) });
};