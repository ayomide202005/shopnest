import axios from 'axios'

// In development this points at the local backend. In production it is set to "/api",
// so the browser only ever talks to the store's own address.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL,
  // Generous because a sleeping free-plan backend can take about a minute to wake up.
  timeout: 60_000,
  withCredentials: true,
})

export default api