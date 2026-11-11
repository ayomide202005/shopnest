import Order from '../models/Order.js';
import { cancelPendingOrder, createOrder } from '../services/orderService.js';
import { startPayment } from '../services/paymentService.js';
import { isObjectId } from '../utils/objectId.js';
import { toOrderDto } from '../utils/orderDto.js';
import { buildPagination } from '../utils/pagination.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Only orders of the signed-in customer. Someone else's order looks the same as a missing one.
const findMyOrder = async (req) =>
  isObjectId(req.params.id) ? Order.findOne({ _id: req.params.id, user: req.user._id }) : null;

// POST /api/orders
export const placeOrder = async (req, res) => {
  const { shippingAddress, notes } = req.body;
  const order = await createOrder({ user: req.user, shippingAddress, notes });
  return res.status(201).json({ order: toOrderDto(order) });
};

// GET /api/orders
export const listMyOrders = async (req, res) => {
  const { page, limit } = res.locals.query;
  const filter = { user: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return res.json({ orders: orders.map(toOrderDto), pagination: buildPagination(page, limit, total) });
};

// GET /api/orders/:id
export const getMyOrder = async (req, res) => {
  const order = await findMyOrder(req);
  if (!order) throw httpError(404, 'Order not found.');
  return res.json({ order: toOrderDto(order) });
};

// POST /api/orders/:id/cancel  (only while the order is waiting for payment)
export const cancelMyOrder = async (req, res) => {
  const order = await findMyOrder(req);
  if (!order) throw httpError(404, 'Order not found.');
  if (order.status !== 'pending_payment') throw httpError(409, 'Only unpaid orders can be cancelled.');

  const cancelled = await cancelPendingOrder({ _id: order._id, user: req.user._id }, 'Cancelled by the customer.');
  if (!cancelled) throw httpError(409, 'Only unpaid orders can be cancelled.'); // it changed a moment ago

  return res.json({ order: toOrderDto(cancelled) });
};

// POST /api/orders/:id/pay  -> { authorizationUrl, reference }. The browser then goes to authorizationUrl.
export const payForOrder = async (req, res) => {
  const order = await findMyOrder(req);
  if (!order) throw httpError(404, 'Order not found.');

  const payment = await startPayment(order, req.user);
  return res.json(payment);
};