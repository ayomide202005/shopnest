import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import useAuth from '../../hooks/useAuth.js'
import { fetchAdminStats } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'
import { formatNaira } from '../../utils/format.js'

const TONES = {
  default: 'text-stone-900',
  warning: 'text-amber-700',
  danger: 'text-red-700',
}

function StatCard({ label, value, hint, tone = 'default', to }) {
  const card = (
    <div
      className={`h-full rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${
        to ? 'transition-colors hover:border-brand-600' : ''
      }`}
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

function StatSkeleton() {
  return <div className="h-28 animate-pulse rounded-xl border border-stone-200 bg-stone-100" />
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading', stats: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminStats({ signal: controller.signal })
      .then((stats) => setState({ status: 'ready', stats, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setState({ status: 'error', stats: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading', stats: null, error: '' })
    setAttempt((count) => count + 1)
  }

  const { status, stats, error } = state

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-stone-600">Welcome back, {user?.name?.split(' ')[0]}.</p>

      <div className="mt-8">
        {status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 11 }, (_, index) => (
              <StatSkeleton key={index} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-md">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Orders and sales</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={`Sales, last ${stats.orders.recentDays} days`}
                value={formatNaira(stats.orders.revenueRecent)}
                hint="Paid orders, not cancelled"
              />
              <StatCard
                label="Sales, all time"
                value={formatNaira(stats.orders.revenueTotal)}
                hint="Paid orders, not cancelled"
              />
              <StatCard
                label="Ready to process"
                value={stats.orders.awaitingFulfilment}
                tone={stats.orders.awaitingFulfilment > 0 ? 'warning' : 'default'}
                hint="Paid, not started yet"
                to="/admin/orders?status=paid"
              />
              <StatCard
                label="Refunds waiting"
                value={stats.orders.refundsWaiting}
                tone={stats.orders.refundsWaiting > 0 ? 'danger' : 'default'}
                hint="Money to return to customers"
                to="/admin/orders?refund=1"
              />
              <StatCard
                label="Processing"
                value={stats.orders.byStatus.processing}
                to="/admin/orders?status=processing"
              />
              <StatCard label="Shipped" value={stats.orders.byStatus.shipped} to="/admin/orders?status=shipped" />
              <StatCard
                label="Awaiting payment"
                value={stats.orders.byStatus.pending_payment}
                to="/admin/orders?status=pending_payment"
              />
              <StatCard label="All orders" value={stats.orders.total} to="/admin/orders" />
            </div>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-stone-500">Products</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total products" value={stats.products.total} />
              <StatCard label="Published" value={stats.products.published} hint="Visible in the shop" />
              <StatCard label="Drafts" value={stats.products.draft} hint="Not visible yet" />
              <StatCard label="Archived" value={stats.products.archived} hint="Hidden from the shop" />
              <StatCard
                label="Low stock"
                value={stats.products.lowStock}
                tone={stats.products.lowStock > 0 ? 'warning' : 'default'}
                hint={`Published, ${stats.products.lowStockThreshold} or fewer left`}
              />
              <StatCard
                label="Out of stock"
                value={stats.products.outOfStock}
                tone={stats.products.outOfStock > 0 ? 'danger' : 'default'}
                hint="Published, none left"
              />
              <StatCard label="Categories" value={stats.categories} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}