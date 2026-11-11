import api from './api.js'

export async function placeOrder(payload) {
  const { data } = await api.post('/orders', payload)
  return data.order
}

export async function fetchOrders(params, { signal } = {}) {
  const { data } = await api.get('/orders', { params, signal })
  return data
}

export async function fetchOrder(id, { signal } = {}) {
  const { data } = await api.get(`/orders/${id}`, { signal })
  return data.order
}

export async function cancelOrder(id) {
  const { data } = await api.post(`/orders/${id}/cancel`)
  return data.order
}

// Asks the server for a Paystack payment page for this order.
// The amount is never sent from here: the server uses the order's total.
export async function startPayment(id) {
  const { data } = await api.post(`/orders/${id}/pay`)
  return data
}

export async function verifyPayment(reference, { signal } = {}) {
  const { data } = await api.post('/payments/verify', { reference }, { signal })
  return data
}

// Starts a payment and sends the browser to Paystack's own payment page.
// Only Paystack's checkout address is accepted, so a wrong answer can never send a customer elsewhere.
export async function payForOrder(id) {
  const { authorizationUrl } = await startPayment(id)

  let url
  try {
    url = new URL(authorizationUrl)
  } catch {
    throw new Error('The payment page address was not valid.')
  }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com') {
    throw new Error('The payment page address was not recognised.')
  }

  window.location.assign(url.href)
}