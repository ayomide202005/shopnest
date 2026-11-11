import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import Button from './ui/Button.jsx'
import CartLink from './store/CartLink.jsx'

export default function Layout() {
  const { user, status, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } catch {
      // The local session is cleared either way; nothing useful to show.
    } finally {
      setSigningOut(false)
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="text-xl font-semibold tracking-tight text-brand-700">
            ShopNest
          </Link>
          <Link to="/products" className="ml-6 text-sm font-medium text-stone-700 hover:text-brand-700">
            Shop
          </Link>

          <nav className="ml-auto flex items-center gap-3 text-sm">
            <CartLink />
            {status === 'ready' &&
              (user ? (
                <>
                  <Link to="/orders" className="font-medium text-stone-700 hover:text-brand-700">
                    My orders
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="font-medium text-stone-700 hover:text-brand-700">
                      Admin
                    </Link>
                  )}
                  <span className="hidden text-stone-600 sm:inline">Hi, {user.name.split(' ')[0]}</span>
                  <Button variant="secondary" size="sm" onClick={handleLogout} loading={signingOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="font-medium text-stone-700 hover:text-brand-700">
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                  >
                    Create account
                  </Link>
                </>
              ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500 sm:px-6">
          <span>&copy; {new Date().getFullYear()} ShopNest</span>
          <nav className="flex gap-4" aria-label="Footer">
            <Link to="/products" className="hover:text-brand-700">
              Shop
            </Link>
            <Link to="/contact" className="hover:text-brand-700">
              Contact us
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}