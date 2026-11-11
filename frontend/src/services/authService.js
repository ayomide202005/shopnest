import axios from 'axios'
import api from './api.js'

export const signup = async (data) => (await api.post('/auth/signup', data)).data
export const login = async (data) => (await api.post('/auth/login', data)).data
export const logout = async () => (await api.post('/auth/logout')).data
export const verifyEmail = async (token) => (await api.post('/auth/verify-email', { token })).data
export const resendVerification = async (email) =>
  (await api.post('/auth/resend-verification', { email })).data
export const forgotPassword = async (email) => (await api.post('/auth/forgot-password', { email })).data
export const resetPassword = async (token, password) =>
  (await api.post('/auth/reset-password', { token, password })).data

// Returns the signed-in user, or null for a visitor (the backend answers 401 for visitors).
export async function fetchCurrentUser({ signal } = {}) {
  try {
    const { data } = await api.get('/auth/me', { signal })
    return data.user
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null
    throw error
  }
}