import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/PageLoader.jsx'
import useAuth from '../hooks/useAuth.js'
import useCart from '../hooks/useCart.js'
import { getErrorMessage } from '../services/apiError.js'
import { MAX_LINE_QUANTITY } from '../utils/cart.js'
import { formatNaira, thumbUrl } from '../utils/format.js'

const ISSUE_TEXT = {
  unavailable: 'This product is no longer available. Please remove it.',
  out_of_stock: 'This product is out of stock. Please remove it.',
}

function CartLine({ line, busy, onSetQuantity, onRemove }) {
  const maxQuantity = Math.min(line.stock, MAX_LINE_QUANTITY)
  const hasIssue = line.issue !== null

  return (
    <li className="flex gap-4 py-5">
      {line.image ? (
        <img src={thumbUrl(line.image, 160)} alt="" className="h-20 w-20 flex-none rounded-lg object-cover sm:h-24 sm:w-24" />
      ) : (
        <div className="flex h-20 w-20 flex-none items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400 sm:h-24 sm:w-24">
          No image
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.slug ? (
              <Link to={`/products/${line.slug}`} className="line-clamp-2 text-sm font-medium text-stone-900 hover:text-brand-700">
                {line.name}
              </Link>
            ) : (
              <p className="text-sm font-medium text-stone-500">{line.name}</p>
            )}
            {line.slug && <p className="mt-0.5 text-sm text-stone-500">{formatNaira(line.price)} each</p>}
          </div>
          <p className="whitespace-nowrap text-sm font-semibold text-stone-900">
            {hasIssue ? '—' : formatNaira(line.lineTotal)}
          </p>
        </div>

        {line.issue === 'insufficient_stock' && (
          <p className="mt-2 text-sm text-amber-700">
            Only {line.stock} available, but you have {line.quantity} in your cart.{' '}
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetQuantity(line.productId, line.stock)}
              className="font-medium underline disabled:opacity-60"
            >
              Change to {line.stock}
            </button>
          </p>
        )}
        {ISSUE_TEXT[line.issue] && <p className="mt-2 text-sm text-red-600">{ISSUE_TEXT[line.issue]}</p>}

        <div className="mt-3 flex items-center justify-between">
          {line.issue === 'unavailable' || line.issue === 'out_of_stock' ? (
            <span />
          ) : (
            <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
              <button
                type="button"
                aria-label={`Decrease quantity of ${line.name}`}
                disabled={busy || line.quantity <= 1}
                onClick={() => onSetQuantity(line.productId, line.quantity - 1)}
                className="px-3 py-1 text-lg text-stone-700 disabled:text-stone-300"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-medium">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Increase quantity of ${line.name}`}
                disabled={busy || line.quantity >= maxQuantity}
                onClick={() => onSetQuantity(line.productId, line.quantity + 1)}
                className="px-3 py-1 text-lg text-stone-700 disabled:text-stone-300"
              >
                +
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(line.productId)}
            className="text-sm font-medium text-red-600 underline disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export default function CartPage() {
  const { isAuthenticated } = useAuth()
  const { cart, status, error, pending, itemCount, setQuantity, removeItem, reload } = useCart()
  const [actionError, setActionError] = useState('')

  const run = async (action) => {
    setActionError('')
    try {
      await action()
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  if (status === 'loading') return <PageLoader />

  if (status === 'error') {
    return (
      <div className="max-w-md">
        <Alert tone="error">{error}</Alert>
        <Button variant="secondary" className="mt-4" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-stone-600">Browse our products and add something you like.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Your cart <span className="text-base font-normal text-stone-500">({itemCount} item{itemCount === 1 ? '' : 's'})</span>
      </h1>

      {actionError && (
        <Alert tone="error" className="mt-4">
          {actionError}
        </Alert>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4 shadow-sm">
          {cart.items.map((line) => (
            <CartLine
              key={line.productId}
              line={line}
              busy={pending}
              onSetQuantity={(id, quantity) => run(() => setQuantity(id, quantity))}
              onRemove={(id) => run(() => removeItem(id))}
            />
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Subtotal</dt>
              <dd className="font-medium">{formatNaira(cart.subtotal)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-stone-500">The final total is confirmed at checkout.</p>

          {cart.hasIssues && (
            <Alert tone="error" className="mt-4">
              Some items need your attention before you can check out.
            </Alert>
          )}

          {cart.hasIssues ? (
            <Button className="mt-5 w-full" disabled>
              Proceed to checkout
            </Button>
          ) : (
            <Link
              to="/checkout"
              className="mt-5 flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Proceed to checkout
            </Link>
          )}
          
          {!isAuthenticated && (
            <p className="mt-3 text-xs text-stone-500">
              You will be asked to{' '}
              <Link to="/login" className="font-medium text-brand-700 underline">
                sign in
              </Link>{' '}
              at checkout. Your cart will be kept.
            </p>
          )}

          <Link to="/products" className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  )
}