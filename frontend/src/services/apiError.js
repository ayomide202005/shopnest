import axios from 'axios'

// A message safe to show to the user.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) return error.response.data.message
    if (error.code === 'ECONNABORTED') return 'The request took too long. Please try again.'
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
  }
  return fallback
}

// { fieldName: 'message' } from validation errors (HTTP 400), for showing under form fields.
export function getFieldErrors(error) {
  return (axios.isAxiosError(error) && error.response?.data?.errors) || {}
}

// Short machine-readable code from the backend, such as 'EMAIL_NOT_VERIFIED'.
export function getErrorCode(error) {
  return (axios.isAxiosError(error) && error.response?.data?.code) || null
}