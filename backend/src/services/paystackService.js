import { paystack } from '../config/paystack.js';

const BASE_URL = 'https://api.paystack.co';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Talks to Paystack. The secret key is only ever used here, on the server.
async function request(path, { method, body } = {}) {
  if (!paystack) throw httpError(503, 'Online payment is not available right now.');

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${paystack.secretKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw httpError(502, 'Could not reach the payment provider. Please try again.');
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.status) {
    console.error(`Paystack request failed (${method} ${path}): HTTP ${response.status} - ${result?.message ?? 'no message'}`);
    throw httpError(502, 'The payment provider could not process this request. Please try again.');
  }

  return result.data;
}

// amount is in kobo.
export const initializeTransaction = ({ email, amount, reference, callbackUrl, metadata }) =>
  request('/transaction/initialize', {
    method: 'POST',
    body: { email, amount, currency: 'NGN', reference, callback_url: callbackUrl, metadata },
  });

export const verifyTransaction = (reference) =>
  request(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });