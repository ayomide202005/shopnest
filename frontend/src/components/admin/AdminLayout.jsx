import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Button from '../ui/Button.jsx'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
]

const navLinkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } catch {
      // The local session is cleared either way.
    } finally {
      setSigningOut(false)
      navigate('/')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/admin" onClick={onNavigate} className="text-lg font-semibold tracking-tight text-brand-700">
          ShopNest
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Admin</p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Admin">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={navLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-stone-200 p-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="block text-sm font-medium text-stone-600 hover:text-brand-700"
        >
          &larr; View store
        </Link>
        <div className="text-sm">
          <p className="truncate font-medium text-stone-900">{user?.name}</p>
          <p className="truncate text-stone-500">{user?.email}</p>
        </div>
        <Button variant="secondary" size="sm" className="w-full" onClick={handleLogout} loading={signingOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu with the Escape key.
  useEffect(() => {
    if (!menuOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-stone-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 lg:hidden">
        <span className="text-lg font-semibold tracking-tight text-brand-700">ShopNest Admin</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Menu
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-stone-900/40"
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}