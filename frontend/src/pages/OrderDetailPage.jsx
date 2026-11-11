import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useParams } from 'react-router-dom'
import ConfirmDeleteModal from '../components/admin/ConfirmDeleteModal.jsx'
import OrderStatusBadge from '../components/store/OrderStatusBadge.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { getErrorCode, getErrorMessage } from '../services/apiError.js'
import { cancelOrder, fetchOrder, payForOrder } from '../services/orderService.js'
import { formatDateTime } from '../utils/dates.js'
import { formatNaira, thumbUrl } from '../utils/format.js'

export default function OrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()

  const [attempt, setAttempt] = useState(0)
  const key = `${id}:${attempt}`
  const [result, setResult] = useState({ key: null, order: null, notFound: false, error: '' })
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [payError, setPayError] = useState('')
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetchOrder(id, { signal: controller.signal })
      .then((order) => setResult({ key, order, notFound: false, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        const notFound = error.response?.status === 404
        setResult({ key, order: null, notFound, error: notFound ? '' : getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [id, key])

  const reload = () => setAttempt((count) => count + 1)

  const handlePay = async () => {
    setPaying(true)
    setPayError('')
    try {
      await payForOrder(id)
      // The browser is now navigating to Paystack, so the button stays busy.
    } catch (error) {
      setPayError(getErrorMessage(error, 'We could not open the payment page. Please try again.'))
      if (getErrorCode(error) === 'ORDER_EXPIRED') reload()
      setPaying(false)
    }
  }

  const handleCancel = async () => {
    await cancelOrder(id)
    setCancelling(false)
    setNotice('Your order was cancelled.')
    reload()
  }

  if (result.key !== key) return <PageLoader />

  const { order, notFound, error } = result

  if (notFound || error) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        {notFound ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Order not found</h1>
            <p className="mt-2 text-sm text-stone-600">We could not find this order on your account.</p>
          </>
        ) : (
          <>
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </>
        )}
        <Link to="/orders" className="mt-6 inline-block text-sm font-medium text-brand-700 underline">
          My orders
        </Link>
      </div>
    )
  }

  const address = order.shippingAddress

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/orders" className="text-sm text-stone-600 hover:text-stone-900">
        ← My orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-stone-600">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {notice && (
        <Alert tone="info" className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-xs font-medium underline">
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {order.status === 'pending_payment' && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">This order is waiting for payment.</p>
          <p className="mt-1 text-sm text-amber-800">
            Your items are held for you until {formatDateTime(order.expiresAt)}. After that the order is cancelled.
          </p>
          {payError && (
            <Alert tone="error" className="mt-3">
              {payError}
            </Alert>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={handlePay} loading={paying}>
              Pay {formatNaira(order.total)} now
            </Button>
            <Button variant="secondary" onClick={() => setCancelling(true)} disabled={paying}>
              Cancel order
            </Button>
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <Alert tone="info" className="mt-6">
          This order was cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}.{' '}
          {order.cancelReason}
        </Alert>
      )}

      {order.paidAt && (
        <p className="mt-6 text-sm text-stone-600">Paid on {formatDateTime(order.paidAt)}.</p>
      )}

      <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4 shadow-sm">
        {order.items.map((item) => (
          <li key={item.productId} className="flex gap-4 py-4">
            {item.image ? (
              <img src={thumbUrl(item.image, 128)} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-16 flex-none rounded-lg bg-stone-100" />
            )}
            <div className="min-w-0 flex-1">
              {item.slug ? (
                <Link to={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand-700">
                  {item.name}
                </Link>
              ) : (
                <p className="text-sm font-medium">{item.name}</p>
              )}
              <p className="mt-0.5 text-xs text-stone-500">
                {formatNaira(item.unitPrice)} × {item.quantity}
              </p>
            </div>
            <p className="whitespace-nowrap text-sm font-semibold">{formatNaira(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">Delivery details</h2>
          <p className="mt-3 text-stone-900">{address.fullName}</p>
          <p className="text-stone-600">{address.phone}</p>
          <p className="mt-2 text-stone-600">
            {address.street}, {address.city}, {address.state}
          </p>
          {address.landmark && <p className="text-stone-600">Near {address.landmark}</p>}
          {order.notes && <p className="mt-3 text-stone-600">Note: {order.notes}</p>}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt className="text-stone-600">Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Delivery</dt>
              <dd>{order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatNaira(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {cancelling && (
        <ConfirmDeleteModal
          title="Cancel order"
          message={`Cancel order ${order.orderNumber}? Your items will be released. You can place a new order any time.`}
          confirmLabel="Cancel order"
          onConfirm={handleCancel}
          onClose={() => setCancelling(false)}
        />
      )}
    </div>
  )
}