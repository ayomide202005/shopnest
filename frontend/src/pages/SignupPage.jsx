import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import TextField from '../components/ui/TextField.jsx'
import { resendVerification, signup } from '../services/authService.js'
import { getErrorMessage, getFieldErrors } from '../services/apiError.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Quick checks for a better experience. The backend repeats and enforces every rule.
function validate({ name, email, password, confirmPassword }) {
  const errors = {}
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Password must contain at least one letter and one number'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'
  return errors
}

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

export default function SignupPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null) // { email, emailSent } after a successful signup
  const [resend, setResend] = useState({ sending: false, message: '', failed: false })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      const email = form.email.trim()
      const result = await signup({ name: form.name.trim(), email, password: form.password })
      setDone({ email, emailSent: result.emailSent })
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResend({ sending: true, message: '', failed: false })
    try {
      const result = await resendVerification(done.email)
      setResend({ sending: false, message: result.message, failed: false })
    } catch (error) {
      setResend({ sending: false, message: getErrorMessage(error), failed: true })
    }
  }

  if (done) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`We created your account. ${
          done.emailSent
            ? `We sent a verification link to ${done.email}.`
            : 'We could not send the verification email just now.'
        }`}
        footer={
          <>
            Already verified?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Open the email and click <strong>Confirm email</strong>. The link expires in 24 hours. If you
          cannot see it, check your spam folder.
        </p>
        <Button variant="secondary" className="mt-5 w-full" onClick={handleResend} loading={resend.sending}>
          Resend verification email
        </Button>
        {resend.message && (
          <Alert tone={resend.failed ? 'error' : 'success'} className="mt-4">
            {resend.message}
          </Alert>
        )}
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Shop faster and keep track of your orders."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}