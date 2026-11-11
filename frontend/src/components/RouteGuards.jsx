import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import PageLoader from './PageLoader.jsx'

// Pages for signed-in users only. Visitors are sent to /login and returned afterwards.
export function ProtectedRoute() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Pages for the store owner only.
export function AdminRoute() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

// Login, signup and similar: signed-in people have no reason to see them.
export function GuestRoute() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (user) {
    const fallback = user.role === 'admin' ? '/admin' : '/'
    return <Navigate to={location.state?.from?.pathname ?? fallback} replace />
  }
  return <Outlet />
}