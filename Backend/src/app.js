import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// The built Vite SPA (../Frontend/dist relative to this repo's Backend/,
// produced by `npm run build` inside Frontend/) — served directly by this
// same process so the frontend and API share one origin in production.
// This keeps `VITE_API_BASE_URL=/api` working unchanged.
const DIST_DIR = path.join(__dirname, '../../Frontend/dist')

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

app.use('/api', routes)

// Anything under /api that didn't match a route above is a real 404 (must
// not fall through to the SPA fallback below).
app.use('/api', notFound, errorHandler)

// Serves the Vite build (repo-root `dist/`) for every non-API request —
// requests for a real static file (JS/CSS/images) are served as-is; anything
// else (e.g. `/teacher/dashboard`) falls through to `index.html` so
// client-side routes survive a hard refresh.
app.use(express.static(DIST_DIR))
app.get(/.*/, (req, res, next) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
    if (err) next(err)
  })
})

app.use(notFound)
app.use(errorHandler)

export default app
