# FIA Platform

FIA (Foundation for Innovation & Action) Career Tours platform — Super Admin
dashboard, School/Teacher Portal login, Teacher Feedback, Student Feedback,
and reporting (CSAT/ITP/NPS, exports) for AWS/Robotics/Music career tours.

## Architecture

```
React/Vite Frontend  →  Node.js / Express API  →  MongoDB
```

One frontend, one backend, kept as two independent projects in this repo.

- **Frontend**: React (Vite), Tailwind CSS, React Router DOM, Axios
- **Backend**: Node.js, Express
- **Database**: MongoDB, via Mongoose
- **Auth**: JWT (HS256, via `jsonwebtoken`), passwords hashed with `bcryptjs`

## Project Structure

```
FIA/
├─ Frontend/                   # React (Vite) app
│  ├─ src/
│  │  ├─ api/                  # Axios clients (admin + teacher, separate auth domains)
│  │  ├─ components/            # Reusable UI primitives + branding
│  │  ├─ context/, hooks/       # AuthContext/TeacherAuthContext + hooks
│  │  ├─ features/              # auth, home, schools, teacherAuth, teacherPortal, ...
│  │  ├─ routes/                # AppRoutes, ProtectedRoute, GuestRoute
│  │  └─ utils/                 # constants (single API_BASE_URL source), tokenStorage
│  ├─ public/
│  ├─ index.html, vite.config.js, eslint.config.js, vercel.json
│  ├─ package.json, package-lock.json, .npmrc
│  └─ .env                      # local config (gitignored) — see Environment Variables below
│
├─ Backend/                    # Node.js / Express API
│  ├─ src/
│  │  ├─ routes/, controllers/, services/   # REST API layers
│  │  ├─ models/                # Mongoose schemas
│  │  ├─ config/                 # env.js (config from process.env), db.js (Mongo connection)
│  │  ├─ middleware/             # authenticate, CORS/error handling, rate limiting
│  │  ├─ utils/                  # CSAT/ITP/NPS, student dummy ID, exports, etc.
│  │  └─ app.js, server.js       # Express app + process entrypoint
│  ├─ scripts/                   # one-off/maintenance scripts (super admin seed, etc.)
│  ├─ package.json, package-lock.json
│  └─ .env                      # local secrets (gitignored) — see Environment Variables below
│
├─ .gitignore
└─ README.md
```

## Getting Started (local development)

Local dev runs **two** processes:

```bash
# 1. Backend
cd Backend
npm install
npm run dev                       # http://127.0.0.1:5000

# 2. Frontend
cd Frontend
npm install
npm run dev                       # http://localhost:5173
```

Open `http://localhost:5173/` — this is the Super Admin login page.
`Frontend/.env`'s `VITE_API_BASE_URL` points the frontend at the local
backend (`http://127.0.0.1:5000/api`) — see `Frontend/src/utils/constants.js`,
the single place `VITE_API_BASE_URL` is read, for the exact fallback rules
and how this changes for a separately-deployed production frontend.

On startup, the backend automatically creates the default Super Admin
account if it doesn't already exist (idempotent) — see `SUPER_ADMIN_LOGIN_ID`
/ `SUPER_ADMIN_PASSWORD` in Environment Variables below.

## Environment Variables

Each app has exactly **one** environment file, never committed:
`Frontend/.env` and `Backend/.env`. Copy the tables below to create them
locally (see the inline comments in each file, once created, for more
detail).

**`Frontend/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend calls the backend at, e.g. `http://127.0.0.1:5000/api` locally |

**`Backend/.env`**

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` — controls error-message masking |
| `PORT` | Port the Express server listens on (default `5000`) |
| `TRUST_PROXY_HOPS` | Reverse-proxy hops in front of this process (Express `trust proxy`) |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origin(s) for CORS |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign/verify auth JWTs |
| `JWT_EXPIRES_IN` | Normal session expiry (e.g. `1d`) |
| `JWT_EXPIRES_IN_REMEMBER_ME` | "Remember Me" session expiry (e.g. `30d`) |
| `SUPER_ADMIN_LOGIN_ID` | Login ID for the auto-seeded default Super Admin |
| `SUPER_ADMIN_PASSWORD` | Password for the auto-seeded default Super Admin |

## Deploying

```bash
cd Frontend && npm run build   # -> Frontend/dist/
cd ../Backend && npm start     # serves Frontend/dist/ + the API from one process
```

For a standalone VPS deployment (e.g. Hostinger KVM): build the frontend,
copy `Frontend/dist/` and the `Backend/` folder to the server, set the real
environment variables for that environment (`Backend/.env` or your host's
own env-var settings), and run `npm start` inside `Backend/` — ideally under
a process manager such as PM2 or systemd. The frontend can also be deployed
separately (e.g. to Vercel) — in that case set `Frontend/.env`'s
`VITE_API_BASE_URL` to the backend's real URL before building.

## Auth Flow Summary

- `POST /api/auth/login` — validates credentials, returns `{ token, admin }`
- `GET /api/auth/me` — returns the current Super Admin if the bearer token is valid
- `POST /api/auth/logout` — stateless no-op (JWTs expire on their own)
- The Axios client attaches `Authorization: Bearer <token>` to every request
  and, on any `401` response, clears stored auth data and fires an
  `auth:unauthorized` event that logs the user out reactively
- Both **Remember Me** on and off store the token in `localStorage` (so
  every tab shares one session) — what actually differs is the JWT's expiry
  (`JWT_EXPIRES_IN` vs `JWT_EXPIRES_IN_REMEMBER_ME`) and a 30-hour
  inactivity timeout tracked client-side (see `Frontend/src/utils/authSession.js`)
- On app load, `AuthProvider` looks for a stored token and calls `/api/auth/me`
  to validate it before deciding whether to treat the user as authenticated
- The frontend `ProtectedRoute` redirects unauthenticated users to `/`;
  `GuestRoute` redirects already-authenticated users away from the login
  page to `/home`
- The Teacher Portal (`/teacher/*`) is a separate auth domain — its own
  axios client, token storage, and context — so an admin and a school never
  share or clobber each other's session
