import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { verifyEmail } from '../services/authService.js'
import { getErrorMessage } from '../services/apiError.js'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState(
    token ? { status: 'verifying', message: '' } : { status: 'error', message: 'This link is missing its token.' },
  )

  // A verification link works only once, and React runs effects twice in development.
  // This guard makes sure the request is sent a single time.
  const requestedToken = useRef(null)

  useEffect(() => {
    if (!token || requestedToken.current === token) return
    requestedToken.current = token

    verifyEmail(token)
      .then((result) => setState({ status: 'success', message: result.message }))
      .catch((error) => setState({ status: 'error', message: getErrorMessage(error) }))
  }, [token])

  if (state.status === 'verifying') {
    return (
      <AuthCard title="Verifying your email">
        <PageLoader />
      </AuthCard>
    )
  }

  if (state.status === 'success') {
    return (
      <AuthCard title="Email verified" subtitle="Your account is ready.">
        <Alert tone="success">{state.message}</Alert>
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
    <AuthCard title="Verification failed">
      <Alert tone="error">{state.message}</Alert>
      <p className="mt-4 text-sm text-stone-600">
        If your email is not verified yet, sign in and we will offer to send you a new link.
      </p>
      <Link
        to="/login"
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
      >
        Go to sign in
      </Link>
    </AuthCard>
  )
}