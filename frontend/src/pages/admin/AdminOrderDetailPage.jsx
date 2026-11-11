import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal.jsx'
import OrderStatusBadge from '../../components/store/OrderStatusBadge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { fetchAdminOrder, resolveOrderRefund, updateOrderStatus } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'
import { formatDateTime } from '../../utils/dates.js'
import { formatNaira, thumbUrl } from '../../utils/format.js'

const ACTIONS = {
  processing: { label: 'Start processing', hint: 'You have started preparing this order.' },
  shipped: { label: 'Mark as shipped', hint: 'The order has left the store.' },
  delivered: { label: 'Mark as delivered', hint: 'The customer has received it.' },
}

const STATUS_WORDS = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()

  const [attempt, setAttempt] = useState(0)
  const key = `${id}:${attempt}`
  const [result, setResult] = useState({ key: null, order: null, notFound: false, error: '' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirm, setConfirm] = useState(null) // 'cancel' | 'refund' | null

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminOrder(id, { signal: controller.signal })
      .then((order) => setResult({ key, order, notFound: false, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        const notFound = error.response?.status === 404
        setResult({ key, order: null, notFound, error: notFound ? '' : getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [id, key])

  const reload = () => setAttempt((count) => count + 1)

  // Every change comes back from the server as the updated order, so the screen always shows the saved truth.
  const applyChange = (order) => setResult((current) => ({ ...current, order }))

  const handleAdvance = async (status) => {
    setBusy(true)
    setActionError('')
    try {
      applyChange(await updateOrderStatus(id, status))
    } catch (error) {
      setActionError(getErrorMessage(error))
      if (error.response?.status === 409) reload()
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    applyChange(await updateOrderStatus(id, 'cancelled'))
    setConfirm(null)
  }

  const handleRefundDone = async () => {
    applyChange(await resolveOrderRefund(id))
    setConfirm(null)
  }

  if (result.key !== key) return <PageLoader />

  const { order, notFound, error } = result

  if (notFound || error) {
    return (
      <div className="max-w-md">
        {notFound ? <p className="text-sm text-stone-700">Order not found.</p> : <Alert tone="error">{error}</Alert>}
        {!notFound && (
          <Button variant="secondary" className="mt-4" onClick={reload}>
            Try again
          </Button>
        )}
        <Link to="/admin/orders" className="mt-4 block text-sm font-medium text-brand-700 underline">
          Back to orders
        </Link>
      </div>
    )
  }

  const address = order.shippingAddress
  const forward = order.nextStatuses.filter((status) => status !== 'cancelled')
  const canCancel = order.nextStatuses.includes('cancelled')
  const paidOrder = order.status !== 'pending_payment'

  return (
    <div className="max-w-4xl">
      <Link to="/admin/orders" className="text-sm text-stone-600 hover:text-stone-900">
        ← All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-stone-600">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {actionError && (
        <Alert tone="error" className="mt-6">
          {actionError}
        </Alert>
      )}

      {order.payment.needsRefund && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-900">Refund needed</p>
          <p className="mt-1 text-sm text-red-800">{order.payment.refundReason}</p>
          <p className="mt-1 text-sm text-red-800">
            Amount paid: <span className="font-medium">{formatNaira(order.payment.paidAmount ?? order.total)}</span>
            {order.payment.reference && (
              <>
                {' '}
                · Paystack reference: <span className="font-mono text-xs">{order.payment.reference}</span>
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-red-800">
            Refund the customer from your Paystack dashboard, then confirm below so this reminder clears.
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => setConfirm('refund')}>
            I have refunded this customer
          </Button>
        </div>
      )}

      {order.payment.refundedAt && (
        <Alert tone="info" className="mt-6">
          Refund marked as done on {formatDateTime(order.payment.refundedAt)}.
        </Alert>
      )}

      {(forward.length > 0 || canCancel) && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Update this order</h2>
          {order.status === 'pending_payment' && (
            <p className="mt-1 text-sm text-stone-600">
              Not paid yet. The customer is still within the payment window
              {order.expiresAt ? ` (until ${formatDateTime(order.expiresAt)})` : ''}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {forward.map((status) => (
              <Button key={status} onClick={() => handleAdvance(status)} loading={busy} title={ACTIONS[status].hint}>
                {ACTIONS[status].label}
              </Button>
            ))}
            {canCancel && (
              <Button variant="danger" onClick={() => setConfirm('cancel')} disabled={busy}>
                Cancel order
              </Button>
            )}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <Alert tone="info" className="mt-6">
          Cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}. {order.cancelReason}
        </Alert>
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
              <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {formatNaira(item.unitPrice)} × {item.quantity}
              </p>
            </div>
            <p className="whitespace-nowrap text-sm font-semibold">{formatNaira(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">Customer</h2>
          <p className="mt-3 text-stone-900">{order.customer?.name ?? 'Deleted account'}</p>
          {order.customer && <p className="break-all text-stone-600">{order.customer.email}</p>}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">Deliver to</h2>
          <p className="mt-3 text-stone-900">{address.fullName}</p>
          <p className="text-stone-600">{address.phone}</p>
          <p className="mt-2 text-stone-600">
            {address.street}, {address.city}, {address.state}
          </p>
          {address.landmark && <p className="text-stone-600">Near {address.landmark}</p>}
          {order.notes && <p className="mt-3 text-stone-600">Customer note: {order.notes}</p>}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">Payment</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt className="text-stone-600">Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Delivery</dt>
              <dd>{order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
              <dt>Total</dt>
              <dd>{formatNaira(order.total)}</dd>
            </div>
          </dl>
          {paidOrder && order.paidAt && (
            <p className="mt-3 text-xs text-stone-500">
              Paid {formatDateTime(order.paidAt)}
              {order.payment.channel ? ` by ${order.payment.channel}` : ''}
            </p>
          )}
        </section>
      </div>

      {order.statusHistory.length > 0 && (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold">History</h2>
          <ul className="mt-3 space-y-2">
            {order.statusHistory.map((entry, index) => (
              <li key={index} className="text-stone-600">
                <span className="font-medium text-stone-900">{STATUS_WORDS[entry.status]}</span> ·{' '}
                {formatDateTime(entry.at)}
                {entry.byName ? ` · ${entry.byName}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirm === 'cancel' && (
        <ConfirmDeleteModal
          title="Cancel order"
          message={
            paidOrder
              ? `Cancel order ${order.orderNumber}? The items go back into stock and the order is marked as needing a refund. This cannot be undone.`
              : `Cancel order ${order.orderNumber}? It has not been paid. The items go back into stock. This cannot be undone.`
          }
          confirmLabel="Cancel order"
          onConfirm={handleCancel}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm === 'refund' && (
        <ConfirmDeleteModal
          title="Confirm refund"
          message={`Only confirm if you have already returned ${formatNaira(order.payment.paidAmount ?? order.total)} to the customer.`}
          confirmLabel="Yes, refunded"
          onConfirm={handleRefundDone}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}