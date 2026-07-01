// Shared axios instance: sets the API base URL and attaches the
// JWT token (from localStorage) to every request automatically.
import axios from 'axios'

// Local dev: frontend (5173) and backend (8000) run as separate servers.
// Production (Vercel services): /api/* is rewritten to the backend service
// on the same domain, so requests must use a relative path instead.
const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:8000' : '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
