import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// This backend is deployed standalone (e.g. on Render) — it does NOT serve
// the frontend. The React/Vite app is deployed separately (e.g. on Vercel)
// and talks to this API cross-origin via VITE_API_BASE_URL (see
// Frontend/src/utils/constants.js). This process must never depend on a
// Frontend/dist build existing on disk.
const app = express()

// Trust exactly `env.trustProxyHops` reverse-proxy hop(s) in front of this
// process (Render's edge proxy is one hop) so `req.ip` resolves to the real
// client address instead of the proxy's own peer address. Without this,
// every request collapses to the same `req.ip` value, which turns
// express-rate-limit's per-IP counters (see middleware/rateLimiters.js)
// into a single counter shared by the entire application — the root cause
// of legitimate concurrent users seeing 429s. Configurable via
// TRUST_PROXY_HOPS instead of hardcoded so this stays correct if the
// hosting provider (and its hop count) ever changes.
app.set('trust proxy', env.trustProxyHops)

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header (Postman, curl, server-to-server calls) — allow.
      // In development also allow any localhost/127.0.0.1 port, since Vite
      // bumps to the next free port (5174, 5175, ...) whenever 5173 is busy.
      const isLocalDev = !env.isProduction && origin && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      if (!origin || env.clientOrigins.includes(origin) || isLocalDev) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`))
      }
    },
  }),
)
app.use(express.json())
app.use(morgan(env.isProduction ? 'combined' : 'dev'))

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// This backend is API-only — there is no frontend to serve here, so the
// root route just confirms the process is up (e.g. for a quick manual
// check), separate from /health above.
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FIA Backend is running' })
})

app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

export default app
