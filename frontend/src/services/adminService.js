import api from './api.js'

export async function fetchAdminStats({ signal } = {}) {
  const { data } = await api.get('/admin/stats', { signal })
  return data
}

// ---- Categories ----
export async function fetchAdminCategories({ signal } = {}) {
  const { data } = await api.get('/admin/categories', { signal })
  return data
}

export async function createCategory(payload) {
  const { data } = await api.post('/admin/categories', payload)
  return data.category
}

export async function updateCategory(id, payload) {
  const { data } = await api.patch(`/admin/categories/${id}`, payload)
  return data.category
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/admin/categories/${id}`)
  return data
}

// ---- Products ----
export async function fetchAdminProducts(params, { signal } = {}) {
  const { data } = await api.get('/admin/products', { params, signal })
  return data
}

export async function fetchAdminProduct(id, { signal } = {}) {
  const { data } = await api.get(`/admin/products/${id}`, { signal })
  return data.product
}

export async function createProduct(payload) {
  const { data } = await api.post('/admin/products', payload)
  return data.product
}

export async function updateProduct(id, payload) {
  const { data } = await api.patch(`/admin/products/${id}`, payload)
  return data.product
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/admin/products/${id}`)
  return data
}

// Sends the files to the backend, which puts them on Cloudinary.
// Returns [{ url, publicId }].
export async function uploadProductImages(files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  const { data } = await api.post('/admin/uploads/images', formData)
  return data.images
}

// ---- Orders ----
export async function fetchAdminOrders(params, { signal } = {}) {
  const { data } = await api.get('/admin/orders', { params, signal })
  return data
}

export async function fetchAdminOrder(id, { signal } = {}) {
  const { data } = await api.get(`/admin/orders/${id}`, { signal })
  return data.order
}

export async function updateOrderStatus(id, status) {
  const { data } = await api.patch(`/admin/orders/${id}/status`, { status })
  return data.order
}

export async function resolveOrderRefund(id) {
  const { data } = await api.post(`/admin/orders/${id}/refund-resolved`, {})
  return data.order
}