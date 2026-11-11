import api from './api.js'

export async function fetchProducts(params, { signal } = {}) {
  const { data } = await api.get('/products', { params, signal })
  return data
}

export async function fetchProduct(slug, { signal } = {}) {
  const { data } = await api.get(`/products/${encodeURIComponent(slug)}`, { signal })
  return data.product
}

export async function fetchCategories({ signal } = {}) {
  const { data } = await api.get('/categories', { signal })
  return data.categories
}