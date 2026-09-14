import axios from 'axios'
import { API_BASE_URL, TEACHER_AUTH_UNAUTHORIZED_EVENT } from '../utils/constants'
import { getStoredTeacherToken, clearStoredTeacherToken, touchTeacherActivity } from '../utils/teacherTokenStorage'
import { tryLocalFallback } from '../utils/apiFallback'

// Separate instance (and separate token storage) from api/axiosClient.js —
// the Admin and Teacher Portal are two independent auth domains that must
// never share or overwrite each other's session.
const teacherAxiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

teacherAxiosClient.interceptors.request.use((config) => {
  const token = getStoredTeacherToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

teacherAxiosClient.interceptors.response.use(
  (response) => {
    // A successful authenticated call counts as activity for the 30-hour
    // inactivity timer — already throttled internally.
    touchTeacherActivity()
    return response
  },
  async (error) => {
    // Only steps in on a real connectivity failure against the production
    // backend (no response at all) — never for an ordinary 401/4xx/5xx, so
    // this can never mask/replace the 401 handling below.
    const fallbackResponse = await tryLocalFallback(teacherAxiosClient, error)
    if (fallbackResponse) return fallbackResponse

    if (error?.response?.status === 401) {
      clearStoredTeacherToken()
      window.dispatchEvent(new Event(TEACHER_AUTH_UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default teacherAxiosClient
