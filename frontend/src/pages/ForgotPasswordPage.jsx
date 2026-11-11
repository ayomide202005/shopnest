import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import TextField from '../components/ui/TextField.jsx'
import { forgotPassword } from '../services/authService.js'
import { getErrorMessage, getFieldErrors } from '../services/apiError.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [doneMessage, setDoneMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setError('')

    setSubmitting(true)
    try {
      const result = await forgotPassword(email.trim())
      setDoneMessage(result.message)
    } catch (err) {
      setError(getFieldErrors(err).email || '')
      setFormError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <Link to="/login" className="font-medium text-brand-700 hover:underline">
      Back to sign in
    </Link>
  )

  if (doneMessage) {
    return (
      <AuthCard title="Check your email" footer={footer}>
        <Alert tone="success">{doneMessage}</Alert>
        <p className="mt-4 text-sm text-stone-600">
          The link expires in 1 hour. If you cannot see the email, check your spam folder.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={footer}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError('')
          }}
          error={error}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  )
}