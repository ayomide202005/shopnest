import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import TextField from '../components/ui/TextField.jsx'
import useAuth from '../hooks/useAuth.js'
import { resendVerification } from '../services/authService.js'
import { getErrorCode, getErrorMessage, getFieldErrors } from '../services/apiError.js'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resend, setResend] = useState({ sending: false, message: '', failed: false })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setUnverified(false)
    setResend({ sending: false, message: '', failed: false })

    const clientErrors = {}
    if (!form.email.trim()) clientErrors.email = 'Email is required'
    if (!form.password) clientErrors.password = 'Password is required'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      // On success the user is stored, and GuestRoute sends them to where they were heading.
      await login({ email: form.email.trim(), password: form.password })
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setUnverified(getErrorCode(error) === 'EMAIL_NOT_VERIFIED')
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResend({ sending: true, message: '', failed: false })
    try {
      const result = await resendVerification(form.email.trim())
      setResend({ sending: false, message: result.message, failed: false })
    } catch (error) {
      setResend({ sending: false, message: getErrorMessage(error), failed: true })
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your ShopNest account."
      footer={
        <>
          New to ShopNest?{' '}
          <Link to="/signup" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        {unverified && (
          <div>
            <Button variant="secondary" className="w-full" onClick={handleResend} loading={resend.sending}>
              Resend verification email
            </Button>
            {resend.message && (
              <Alert tone={resend.failed ? 'error' : 'success'} className="mt-3">
                {resend.message}
              </Alert>
            )}
          </div>
        )}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <div>
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}