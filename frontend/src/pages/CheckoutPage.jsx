import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import SelectField from '../components/ui/SelectField.jsx'
import TextAreaField from '../components/ui/TextAreaField.jsx'
import TextField from '../components/ui/TextField.jsx'
import PageLoader from '../components/PageLoader.jsx'
import useAuth from '../hooks/useAuth.js'
import useCart from '../hooks/useCart.js'
import { getErrorCode, getErrorMessage, getFieldErrors } from '../services/apiError.js'
import { payForOrder, placeOrder } from '../services/orderService.js'
import { formatNaira, thumbUrl } from '../utils/format.js'
import { NIGERIAN_STATES } from '../utils/nigerianStates.js'

const PHONE_PATTERN = /^(\+234|234|0)[789][01]\d{8}$/

// The server reports address problems as "shippingAddress.phone"; the form fields are just "phone".
const withoutPrefix = (errors) =>
  Object.fromEntries(Object.entries(errors).map(([name, message]) => [name.replace(/^shippingAddress\./, ''), message]))

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cart, status, error: cartError, reload } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: user?.name ?? '',
    phone: '',
    street: '',
    city: '',
    state: '',
    landmark: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState({ message: '', code: null })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const validate = () => {
    const found = {}
    if (form.fullName.trim().length < 2) found.fullName = 'Enter your full name'
    if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, ''))) {
      found.phone = 'Enter a valid Nigerian phone number, for example 08012345678'
    }
    if (form.street.trim().length < 5) found.street = 'Enter your street address'
    if (form.city.trim().length < 2) found.city = 'Enter your city'
    if (!form.state) found.state = 'Choose your state'
    return found
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError({ message: '', code: null })

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)

    // 1. The server builds the order from your saved cart (prices and stock are checked there).
    let order
    try {
      order = await placeOrder({
        shippingAddress: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state,
          landmark: form.landmark.trim() || undefined,
        },
        notes: form.notes.trim() || undefined,
      })
    } catch (error) {
      const code = getErrorCode(error)
      setErrors(withoutPrefix(getFieldErrors(error)))
      setFormError({ message: getErrorMessage(error), code })
      if (code === 'CART_CHANGED') reload() // so the cart shows what changed
      setSubmitting(false)
      return
    }

    // 2. Pay for it. This leaves our site for Paystack's payment page.
    try {
      await payForOrder(order.id)
      // The browser is now navigating away, so the button stays busy.
    } catch (error) {
      reload() // the cart was emptied when the order was placed
      navigate(`/orders/${order.id}`, {
        replace: true,
        state: {
          notice: `Your order ${order.orderNumber} was placed, but we could not open the payment page. ${getErrorMessage(
            error,
            'Please try again.',
          )} You can pay from this page.`,
        },
      })
    }
  }

  if (status === 'loading') return <PageLoader />

  if (status === 'error') {
    return (
      <div className="max-w-md">
        <Alert tone="error">{cartError}</Alert>
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
        <p className="mt-2 text-sm text-stone-600">Add something to your cart before checking out.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue shopping
        </Link>
      </div>
    )
  }

  if (cart.hasIssues) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart needs attention</h1>
        <p className="mt-2 text-sm text-stone-600">
          Some items are no longer available in the quantity you chose. Please review your cart.
        </p>
        <Link
          to="/cart"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Review cart
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/cart" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to cart
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <h2 className="text-base font-semibold">Delivery details</h2>

          {formError.message && (
            <Alert tone="error">
              {formError.message}{' '}
              {formError.code === 'TOO_MANY_UNPAID_ORDERS' && (
                <Link to="/orders" className="font-medium underline">
                  View my orders
                </Link>
              )}
            </Alert>
          )}

          <TextField
            label="Full name"
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
          />
          <TextField
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="08012345678"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
          />
          <TextField
            label="Street address"
            name="street"
            autoComplete="street-address"
            value={form.street}
            onChange={handleChange}
            error={errors.street}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="City / town"
              name="city"
              autoComplete="address-level2"
              value={form.city}
              onChange={handleChange}
              error={errors.city}
            />
            <SelectField label="State" name="state" value={form.state} onChange={handleChange} error={errors.state}>
              <option value="">Choose your state</option>
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Nearest landmark (optional)"
            name="landmark"
            value={form.landmark}
            onChange={handleChange}
            error={errors.landmark}
          />
          <TextAreaField
            label="Note for the seller (optional)"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            error={errors.notes}
          />

          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            {submitting ? 'Please wait…' : `Place order and pay ${formatNaira(cart.total)}`}
          </Button>
          <p className="text-xs text-stone-500">
            You will be taken to Paystack to pay securely. We never see your card details.
          </p>
        </form>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Order summary</h2>
          <ul className="mt-4 divide-y divide-stone-100">
            {cart.items.map((line) => (
              <li key={line.productId} className="flex gap-3 py-3">
                {line.image ? (
                  <img src={thumbUrl(line.image, 96)} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 flex-none rounded-lg bg-stone-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-stone-900">{line.name}</p>
                  <p className="text-xs text-stone-500">Qty {line.quantity}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-medium">{formatNaira(line.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Subtotal</dt>
              <dd>{formatNaira(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Delivery</dt>
              <dd>{cart.deliveryFee === 0 ? 'Free' : formatNaira(cart.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatNaira(cart.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}