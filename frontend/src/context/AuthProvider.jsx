import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { AuthContext } from './AuthContext.js'
import * as authService from '../services/authService.js'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' until the first /me answer, then 'ready'

  useEffect(() => {
    const controller = new AbortController()

    authService
      .fetchCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        setUser(currentUser)
        setStatus('ready')
      })
      .catch((error) => {
        if (axios.isCancel(error)) return
        setUser(null) // backend unreachable: treat as signed out
        setStatus('ready')
      })

    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}