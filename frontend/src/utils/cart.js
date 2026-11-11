export const MAX_LINE_QUANTITY = 20 // of one product (the server enforces this too)
export const MAX_CART_LINES = 30

export const EMPTY_CART = { items: [], subtotal: 0, deliveryFee: 0, total: 0, hasIssues: false }

const STORAGE_KEY = 'shopnest.cart'

// The guest cart is only a list of { productId, quantity }. Prices always come from the server.
export function readGuestItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.productId === 'string' &&
          /^[a-f0-9]{24}$/i.test(item.productId) &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1 &&
          item.quantity <= MAX_LINE_QUANTITY,
      )
      .slice(0, MAX_CART_LINES)
      .map(({ productId, quantity }) => ({ productId, quantity }))
  } catch {
    return [] // storage blocked or the saved text is damaged
  }
}

export function writeGuestItems(items) {
  try {
    if (items.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage may be blocked (private mode). The cart then lasts until the page is closed.
  }
}

export function clearGuestItems() {
  writeGuestItems([])
}