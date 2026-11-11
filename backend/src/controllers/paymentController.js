import { createHmac, timingSafeEqual } from 'node:crypto';
import { paystack } from '../config/paystack.js';
import { settlePayment } from '../services/paymentService.js';
import { toOrderDto } from '../utils/orderDto.js';

// Paystack signs every webhook with HMAC-SHA512 of the raw body, using our secret key.
const isValidSignature = (rawBody, signature) => {
  if (!paystack || !Buffer.isBuffer(rawBody) || typeof signature !== 'string') return false;

  const expected = Buffer.from(createHmac('sha512', paystack.secretKey).update(rawBody).digest('hex'), 'utf8');
  const given = Buffer.from(signature, 'utf8');

  return given.length === expected.length && timingSafeEqual(given, expected);
};

// POST /api/payments/verify  (signed-in customer, after returning from Paystack)
export const verifyPayment = async (req, res) => {
  const { order, outcome } = await settlePayment(req.body.reference, { userId: req.user._id });
  return res.json({ outcome, order: toOrderDto(order) });
};

// POST /api/payments/webhook  (called by Paystack, not by a browser)
export const paystackWebhook = async (req, res) => {
  if (!isValidSignature(req.rawBody, req.get('x-paystack-signature'))) {
    return res.status(401).json({ message: 'Invalid signature.' });
  }

  const event = req.body;

  if (event?.event === 'charge.success' && typeof event.data?.reference === 'string') {
    try {
      // The payload is NOT trusted: settlePayment asks Paystack directly what happened.
      await settlePayment(event.data.reference);
    } catch (error) {
      // Not one of our orders (for example another app on the same Paystack account): nothing to retry.
      if (error.statusCode === 404) return res.sendStatus(200);
      console.error(`Webhook could not settle ${event.data.reference}:`, error.message);
      return res.sendStatus(500); // Paystack will send it again later
    }
  }

  return res.sendStatus(200);
};