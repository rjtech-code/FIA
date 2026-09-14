import axios from 'axios'
import { API_BASE_URL, LOCAL_API_BASE_URL } from './constants'

// Production-first, local-fallback API base URL resolution.
//
// API_BASE_URL (production, by default — see constants.js) is always tried
// first, for every request, in every environment. This module only steps
// in when a request against it fails with a genuine connectivity error —
// no HTTP response was received at all (DNS failure, connection refused,
// timed out, blocked by CORS) — which is the only reliable signal that the
// production backend is actually unreachable, as opposed to a normal
// 4xx/5xx response (the server WAS reached and answered; that's a real
// business/auth error, not an availability problem, and must never trigger
// a fallback).
//
// Only meaningful when API_BASE_URL is a real, separately-hosted absolute
// URL that differs from the local fallback — never fires for a relative
// same-origin path (e.g. `/api`, nothing to "fall back" from) or when
// API_BASE_URL already IS the local backend.
const CAN_FALLBACK_TO_LOCAL =
  Boolean(API_BASE_URL) && API_BASE_URL !== LOCAL_API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)

// Attach to an axios instance's response interceptor's rejection handler —
// call this FIRST, before any existing error handling (e.g. 401 logout),
// so a transient production outage never gets treated as an auth failure.
//
// Returns the successful retry's response if the local fallback answered,
// or `undefined` if no fallback applied/helped (caller keeps handling the
// original `error` exactly as before — nothing about existing error
// handling changes in that case).
export async function tryLocalFallback(instance, error) {
  if (!CAN_FALLBACK_TO_LOCAL) return undefined

  const config = error?.config
  const isNetworkFailure = Boolean(error) && !error.response && !axios.isCancel(error)
  if (!isNetworkFailure || !config || config.__fiaLocalFallbackAttempted) return undefined

  // Only retry requests that were actually aimed at the production base —
  // never re-retry a request that already targeted (or was already retried
  // against) the local backend.
  const requestBaseUrl = config.baseURL ?? instance.defaults.baseURL
  if (requestBaseUrl !== API_BASE_URL) return undefined

  try {
    const response = await instance.request({
      ...config,
      baseURL: LOCAL_API_BASE_URL,
      __fiaLocalFallbackAttempted: true,
    })
    // Production didn't answer at all this time — prefer the local backend
    // for the rest of this session instead of re-discovering the same
    // outage on every subsequent request.
    instance.defaults.baseURL = LOCAL_API_BASE_URL
    return response
  } catch {
    // Local isn't reachable either (or the same request also fails there)
    // — let the caller reject with the original production error.
    return undefined
  }
}
