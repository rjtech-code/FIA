import axios from 'axios'
import { API_BASE_URL, AUTH_UNAUTHORIZED_EVENT } from '../utils/constants'
import { getStoredToken, clearStoredToken, touchActivity } from '../utils/tokenStorage'
import { tryLocalFallback } from '../utils/apiFallback'

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosClient.interceptors.response.use(
  (response) => {
    // A successful authenticated call counts as activity for the 30-hour
    // inactivity timer — already throttled internally, so this is safe
    // even under heavy API usage (dashboard polling, etc.).
    touchActivity()
    return response
  },
  async (error) => {
    // Only steps in on a real connectivity failure against the production
    // backend (no response at all) — never for an ordinary 401/4xx/5xx, so
    // this can never mask/replace the 401 handling below.
    const fallbackResponse = await tryLocalFallback(axiosClient, error)
    if (fallbackResponse) return fallbackResponse

    if (error?.response?.status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default axiosClient
