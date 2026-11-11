import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { getErrorMessage } from '../services/apiError.js'
import { verifyPayment } from '../services/orderService.js'
import { formatNaira } from '../utils/format.js'

// Paystack sends the customer back here. We never trust the address itself:
// the server asks Paystack what really happened to this payment.
export default function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const reference = params.get('reference') ?? params.get('trxref') ?? ''

  const [attempt, setAttempt] = useState(0)
  const key = `${reference}:${attempt}`
  const [result, setResult] = useState({ key: null, outcome: null, order: null, error: '' })

  useEffect(() => {
    if (!reference) return undefined

    const controller = new AbortController()

    verifyPayment(reference, { signal: controller.signal })
      .then(({ outcome, order }) => setResult({ key, outcome, order, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setResult({ key, outcome: null, order: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [reference, key])

  if (!reference) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Payment not found</h1>
        <p className="mt-2 text-sm text-stone-600">We could not find a payment to check.</p>
        <Link to="/orders" className="mt-6 inline-block text-sm font-medium text-brand-700 underline">
          View my orders
        </Link>
      </div>
    )
  }

  if (result.key !== key) {
    return (
      <div className="py-12 text-center">
        <PageLoader />
        <p className="text-sm text-stone-600">Confirming your payment. Please do not close this page.</p>
      </div>
    )
  }

  const { outcome, order, error } = result

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Alert tone="error">{error}</Alert>
        <p className="mt-3 text-sm text-stone-600">
          If you were charged, your order will still be updated. You can check it under My orders.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => setAttempt((count) => count + 1)}>Check again</Button>
          <Link
            to="/orders"
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            My orders
          </Link>
        </div>
      </div>
    )
  }

  if (outcome === 'paid' || outcome === 'already_paid') {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Payment received</h1>
        <p className="mt-2 text-sm text-stone-600">
          Thank you! Your order <span className="font-medium text-stone-900">{order.orderNumber}</span> for{' '}
          {formatNaira(order.total)} is confirmed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            View order
          </Link>
          <Link
            to="/products"
            className="inline-flex rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  if (outcome === 'refund_needed') {
    return (
      <div className="mx-auto max-w-md py-12">
        <Alert tone="error">
          We received your payment, but we could not complete order{' '}
          <span className="font-semibold">{order.orderNumber}</span>. Please contact the store and quote this order
          number so your money can be refunded.
        </Alert>
        <Link to={`/orders/${order.id}`} className="mt-4 inline-block text-sm font-medium text-brand-700 underline">
          View order
        </Link>
      </div>
    )
  }

  // abandoned, failed, or still pending at Paystack
  const stillProcessing = outcome === 'pending'
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {stillProcessing ? 'Payment is still processing' : 'Payment not completed'}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        {stillProcessing
          ? 'Paystack has not confirmed this payment yet. Please check again in a moment.'
          : `No money was taken for order ${order.orderNumber}. You can try paying again.`}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {stillProcessing && <Button onClick={() => setAttempt((count) => count + 1)}>Check again</Button>}
        <Link
          to={`/orders/${order.id}`}
          className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {stillProcessing ? 'View order' : 'Go to my order'}
        </Link>
      </div>
    </div>
  )
}