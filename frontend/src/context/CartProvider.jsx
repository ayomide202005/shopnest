import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartContext } from './CartContext.js'
import useAuth from '../hooks/useAuth.js'
import * as cartService from '../services/cartService.js'
import { getErrorMessage } from '../services/apiError.js'
import { EMPTY_CART, MAX_LINE_QUANTITY, clearGuestItems, readGuestItems, writeGuestItems } from '../utils/cart.js'

// Guest: price the browser's list. Signed in: merge any guest items, then read the saved cart.
async function loadCart(isAuthenticated) {
  const guestItems = readGuestItems()

  if (isAuthenticated) {
    if (guestItems.length > 0) {
      const merged = await cartService.mergeCart(guestItems)
      clearGuestItems() // only after the server confirmed the merge
      return merged
    }
    return cartService.fetchCart()
  }

  return guestItems.length > 0 ? cartService.previewCart(guestItems) : EMPTY_CART
}

export default function CartProvider({ children }) {
  const { isAuthenticated, status: authStatus } = useAuth()
  const owner = isAuthenticated ? 'user' : 'guest'

  // "owner" records whose cart this is, so a signed-out visitor never sees the last user's cart.
  const [data, setData] = useState({ owner: null, cart: EMPTY_CART })
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(0)

  const cartRef = useRef(EMPTY_CART)
  const queueRef = useRef(Promise.resolve())

  // Cart operations run one after another, so quick clicks cannot overwrite each other.
  const enqueue = useCallback((task) => {
    const run = queueRef.current.then(task)
    queueRef.current = run.catch(() => {})
    return run
  }, [])

  useEffect(() => {
    if (authStatus !== 'ready') return undefined

    let cancelled = false
    const ownerNow = isAuthenticated ? 'user' : 'guest'

    enqueue(async () => {
      try {
        const next = await loadCart(isAuthenticated)
        if (cancelled) return
        cartRef.current = next
        setData({ owner: ownerNow, cart: next })
        setLoadError(null)
      } catch (error) {
        if (!cancelled) setLoadError({ owner: ownerNow, message: getErrorMessage(error) })
      }
    })

    return () => {
      cancelled = true
    }
  }, [authStatus, isAuthenticated, attempt, enqueue])

  // buildItems receives the current [{ productId, quantity }] and returns the new list.
  const commit = useCallback(
    (buildItems) => {
      setPending((count) => count + 1)

      return enqueue(async () => {
        const current = cartRef.current.items.map(({ productId, quantity }) => ({ productId, quantity }))
        const rawItems = buildItems(current)

        let next
        if (isAuthenticated) {
          next = await cartService.saveCart(rawItems)
        } else {
          next = rawItems.length > 0 ? await cartService.previewCart(rawItems) : EMPTY_CART
          writeGuestItems(next.items.map(({ productId, quantity }) => ({ productId, quantity })))
        }

        cartRef.current = next
        setData({ owner: isAuthenticated ? 'user' : 'guest', cart: next })
        return next
      }).finally(() => setPending((count) => count - 1))
    },
    [enqueue, isAuthenticated],
  )

  const addItem = useCallback(
    (productId, quantity = 1) =>
      commit((items) => {
        const existing = items.find((item) => item.productId === productId)
        if (!existing) return [...items, { productId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }]
        return items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_LINE_QUANTITY) }
            : item,
        )
      }),
    [commit],
  )

  const setQuantity = useCallback(
    (productId, quantity) =>
      commit((items) =>
        items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, Math.min(quantity, MAX_LINE_QUANTITY)) }
            : item,
        ),
      ),
    [commit],
  )

  const removeItem = useCallback(
    (productId) => commit((items) => items.filter((item) => item.productId !== productId)),
    [commit],
  )

  const clearCart = useCallback(() => commit(() => []), [commit])

  const reload = useCallback(() => {
    setLoadError(null)
    setAttempt((count) => count + 1)
  }, [])

  const cart = data.owner === owner ? data.cart : EMPTY_CART
  let status = 'loading'
  if (loadError?.owner === owner) status = 'error'
  else if (authStatus === 'ready' && data.owner === owner) status = 'ready'

  const value = useMemo(
    () => ({
      cart,
      status,
      error: loadError?.owner === owner ? loadError.message : '',
      itemCount: cart.items.reduce((sum, line) => sum + line.quantity, 0),
      pending: pending > 0,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      reload,
    }),
    [cart, status, loadError, owner, pending, addItem, setQuantity, removeItem, clearCart, reload],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}