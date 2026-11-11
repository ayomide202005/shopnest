import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import OrderStatusBadge from '../../components/store/OrderStatusBadge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import { fetchAdminOrders } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'
import { formatDateTime } from '../../utils/dates.js'
import { formatNaira } from '../../utils/format.js'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['pending_payment', 'Awaiting payment'],
  ['paid', 'Paid'],
  ['processing', 'Processing'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
]

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['total_desc', 'Highest total'],
  ['total_asc', 'Lowest total'],
]

const VALID_STATUSES = STATUS_OPTIONS.map(([value]) => value)
const VALID_SORTS = SORT_OPTIONS.map(([value]) => value)

const inputClass =
  'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

export default function AdminOrdersPage() {
  // The filters live in the address bar, so dashboard cards can link straight to a filtered list.
  const [params, setParams] = useSearchParams()
  const status = VALID_STATUSES.includes(params.get('status') ?? '') ? (params.get('status') ?? '') : ''
  const search = params.get('search') ?? ''
  const refund = params.get('refund') === '1'
  const sort = VALID_SORTS.includes(params.get('sort') ?? '') ? params.get('sort') : 'newest'
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  const [searchInput, setSearchInput] = useState(search)
  const [attempt, setAttempt] = useState(0)
  const key = `${status}|${search}|${refund}|${sort}|${page}|${attempt}`
  const [result, setResult] = useState({ key: null, orders: [], pagination: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    const query = { page, limit: 20, sort }
    if (status) query.status = status
    if (search) query.search = search
    if (refund) query.needsRefund = 'true'

    fetchAdminOrders(query, { signal: controller.signal })
      .then(({ orders, pagination }) => setResult({ key, orders, pagination, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setResult({ key, orders: [], pagination: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [key, page, sort, status, search, refund])

  const update = (changes) => {
    const next = { status, search, sort, page: '1', ...(refund ? { refund: '1' } : {}), ...changes }
    const clean = Object.fromEntries(
      Object.entries(next).filter(
        ([name, value]) => value && !(name === 'sort' && value === 'newest') && !(name === 'page' && value === '1'),
      ),
    )
    setParams(clean)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    update({ search: searchInput.trim() })
  }

  const loading = result.key !== key
  const { orders, pagination, error } = result

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-stone-600">Customer orders, newest first by default.</p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Order number, name, email or phone"
          aria-label="Search orders"
          className={`${inputClass} w-full sm:w-72`}
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        <select
          value={status}
          onChange={(event) => update({ status: event.target.value })}
          aria-label="Filter by status"
          className={inputClass}
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => update({ sort: event.target.value })}
          aria-label="Sort orders"
          className={inputClass}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={refund}
            onChange={(event) => update({ refund: event.target.checked ? '1' : '' })}
            className="h-4 w-4 rounded border-stone-300"
          />
          Refunds waiting
        </label>
      </form>

      <div className="mt-6">
        {loading && <div className="h-48 animate-pulse rounded-xl border border-stone-200 bg-stone-100" aria-busy="true" />}

        {!loading && error && (
          <div className="max-w-md">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600">
            No orders match these filters.
          </p>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Placed</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link to={`/admin/orders/${order.id}`} className="font-medium text-brand-700 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-900">{order.shippingAddress.fullName}</p>
                        <p className="text-xs text-stone-500">{order.customer?.email ?? 'Deleted account'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDateTime(order.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatNaira(order.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          {order.payment.needsRefund && (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Refund due
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
              <span>
                {pagination.total} order{pagination.total === 1 ? '' : 's'} · page {pagination.page} of{' '}
                {Math.max(1, pagination.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => update({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}