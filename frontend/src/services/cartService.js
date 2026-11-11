import api from './api.js'

export async function previewCart(items, { signal } = {}) {
  const { data } = await api.post('/cart/preview', { items }, { signal })
  return data
}

export async function fetchCart({ signal } = {}) {
  const { data } = await api.get('/cart', { signal })
  return data
}

export async function saveCart(items) {
  const { data } = await api.put('/cart', { items })
  return data
}

export async function mergeCart(items) {
  const { data } = await api.post('/cart/merge', { items })
  return data
}