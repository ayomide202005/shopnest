import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import OrderStatusBadge from '../components/store/OrderStatusBadge.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { getErrorMessage } from '../services/apiError.js'
import { fetchOrders } from '../services/orderService.js'
import { formatDateTime } from '../utils/dates.js'
import { formatNaira } from '../utils/format.js'

const PAGE_SIZE = 10

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const key = `${page}:${attempt}`
  const [result, setResult] = useState({ key: null, orders: [], pagination: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()

    fetchOrders({ page, limit: PAGE_SIZE }, { signal: controller.signal })
      .then(({ orders, pagination }) => setResult({ key, orders, pagination, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setResult({ key, orders: [], pagination: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [page, key])

  const loading = result.key !== key
  const { orders, pagination, error } = result

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>

      <div className="mt-6">
        {loading && <PageLoader />}

        {!loading && error && (
          <div className="max-w-md">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-sm text-stone-600">You have not placed any orders yet.</p>
            <Link
              to="/products"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Start shopping
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
              {orders.map((order) => {
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <li key={order.id}>
                    <Link to={`/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-stone-50">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{order.orderNumber}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {formatDateTime(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-sm font-semibold">{formatNaira(order.total)}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-stone-600">
                <Button variant="secondary" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}