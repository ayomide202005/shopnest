import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import TextField from '../components/ui/TextField.jsx'
import useAuth from '../hooks/useAuth.js'
import { resetPassword } from '../services/authService.js'
import { getErrorMessage, getFieldErrors } from '../services/apiError.js'

// Quick checks for a better experience. The backend repeats and enforces every rule.
function validate({ password, confirmPassword }) {
  const errors = {}
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Password must contain at least one letter and one number'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'
  return errors
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { logout } = useAuth()

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

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
      const result = await resetPassword(token, form.password)
      setSuccess(result.message)
      // The backend ended every session for this account; clear this browser's signed-in state too.
      logout().catch(() => {})
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Reset link problem">
        <Alert tone="error">This link is missing its token.</Alert>
        <Link
          to="/forgot-password"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Request a new link
        </Link>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard title="Password updated">
        <Alert tone="success">{success}</Alert>
        <Link
          to="/login"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Pick a strong password you have not used before."
      footer={
        <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
          Link expired? Request a new one
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <TextField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthCard>
  )
}