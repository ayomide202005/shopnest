import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import TextAreaField from '../components/ui/TextAreaField.jsx'
import TextField from '../components/ui/TextField.jsx'
import useAuth from '../hooks/useAuth.js'
import { getErrorMessage, getFieldErrors } from '../services/apiError.js'
import { sendContactMessage } from '../services/contactService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactPage() {
  const { user } = useAuth()

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    orderNumber: '',
    message: '',
    website: '', // hidden field: only bots fill it in
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const validate = () => {
    const found = {}
    if (form.name.trim().length < 2) found.name = 'Enter your name'
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = 'Enter a valid email address'
    if (form.message.trim().length < 10) found.message = 'Please write at least 10 characters'
    return found
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        orderNumber: form.orderNumber.trim() || undefined,
        message: form.message.trim(),
        website: form.website,
      })
      setSent(true)
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
      setFormError(getErrorMessage(error, 'We could not send your message. Please try again.'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Message sent</h1>
        <p className="mt-2 text-sm text-stone-600">
          Thank you. We will reply to <span className="font-medium text-stone-900">{form.email.trim()}</span> as soon
          as we can.
        </p>
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
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Contact us</h1>
      <p className="mt-1 text-sm text-stone-600">
        Questions about an order, a payment or a product? Send us a message and we will reply by email. If you are
        asking about an order, include its number (it starts with SN-).
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Your name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          maxLength={80}
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          maxLength={254}
        />
        <TextField
          label="Order number (optional)"
          name="orderNumber"
          value={form.orderNumber}
          onChange={handleChange}
          error={errors.orderNumber}
          placeholder="SN-261110-ABC123"
          maxLength={30}
        />
        <TextAreaField
          label="Message"
          name="message"
          rows={6}
          value={form.message}
          onChange={handleChange}
          error={errors.message}
          maxLength={2000}
        />

        {/* Hidden from people, visible to bots. */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            Leave this field empty
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={handleChange}
            />
          </label>
        </div>

        <Button type="submit" loading={sending}>
          Send message
        </Button>
      </form>
    </div>
  )
}