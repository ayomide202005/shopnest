import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import useCart from '../../hooks/useCart.js'
import { getErrorMessage } from '../../services/apiError.js'
import { MAX_LINE_QUANTITY } from '../../utils/cart.js'

export default function AddToCart({ product }) {
  const { cart, status, addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  if (!product.inStock) {
    return (
      <Button className="mt-6 w-full sm:w-auto" disabled>
        Out of stock
      </Button>
    )
  }

  const inCart = cart.items.find((line) => line.productId === product.id)?.quantity ?? 0
  const room = Math.min(product.stock, MAX_LINE_QUANTITY) - inCart // how many more can be added
  const chosen = Math.min(quantity, Math.max(room, 1))

  const handleAdd = async () => {
    setAdding(true)
    setMessage({ type: '', text: '' })
    try {
      await addItem(product.id, chosen)
      setQuantity(1)
      setMessage({ type: 'success', text: 'Added to your cart.' })
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mt-6">
      {room > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(Math.max(1, chosen - 1))}
              disabled={chosen <= 1}
              className="px-3 py-2 text-lg text-stone-700 disabled:text-stone-300"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-medium" aria-live="polite">
              {chosen}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity(Math.min(room, chosen + 1))}
              disabled={chosen >= room}
              className="px-3 py-2 text-lg text-stone-700 disabled:text-stone-300"
            >
              +
            </button>
          </div>
          <Button onClick={handleAdd} loading={adding} disabled={status !== 'ready'}>
            Add to cart
          </Button>
        </div>
      ) : (
        <Button disabled>All available units are in your cart</Button>
      )}

      {inCart > 0 && (
        <p className="mt-3 text-sm text-stone-600">
          You have {inCart} in your cart.{' '}
          <Link to="/cart" className="font-medium text-brand-700 underline">
            View cart
          </Link>
        </p>
      )}

      {message.text && (
        <Alert tone={message.type === 'error' ? 'error' : 'success'} className="mt-3">
          {message.text}
        </Alert>
      )}
    </div>
  )
}