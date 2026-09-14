export const ROUTES = {
  LOGIN: '/',
  HOME: '/home',
  SUBMISSIONS: '/submissions',
  EXPORT: '/export',
  TARGETS: '/targets',
}

export const TEACHER_ROUTES = {
  LOGIN: '/teacher',
  DASHBOARD: '/teacher/dashboard',
  FEEDBACK: '/teacher/feedback',
  STUDENT_FEEDBACK: '/teacher/student-feedback',
}

// Single central source of truth for the API base URL — every axios client
// (see src/api/*Client.js) imports this; nothing else decides the base URL.
//
// - `VITE_API_BASE_URL` (from Frontend/.env) always wins when set — this is
//   how a separately-domained production API or a non-default local port
//   gets configured.
// - Otherwise, `import.meta.env.DEV` (true under `vite`/`vite dev`, false in
//   a `vite build`) picks a safe, environment-correct default:
//     dev  -> http://127.0.0.1:5000/api (the local Node/Express server, see
//             Backend/src/server.js)
//     prod -> /api (same-origin — the Node/Express server serves both the
//             SPA and the API from one process, see Backend/src/app.js)
// This guarantees a missing env var NEVER silently points a local dev
// server at production (or vice versa) — a fallback hardcoding the
// production URL here would mean a fresh clone with no Frontend/.env set up
// yet could have `npm run dev` call production by accident.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5000/api' : '/api')

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'
export const TEACHER_AUTH_UNAUTHORIZED_EVENT = 'teacherAuth:unauthorized'

// One-shot sessionStorage flags: set by AuthProvider/TeacherAuthProvider
// right before clearing a session that expired "underneath" an actively
// browsing user (cross-tab logout or 30-hour inactivity) — LoginForm/
// TeacherLoginForm read + clear these on mount to show a clear "your
// session expired" message instead of silently landing back on a blank
// login page. sessionStorage (not localStorage) is deliberate: this is a
// one-time UI note for whichever tab lands on the login page next, not
// session state itself.
export const SESSION_EXPIRED_FLAG = 'fia_admin_session_expired'
export const TEACHER_SESSION_EXPIRED_FLAG = 'fia_teacher_session_expired'

// Dispatched whenever an admin action changes school/feedback data
// (upload, delete) — every useSchoolRecords() instance across the app
// listens for this and refetches immediately, so all dashboard cards/tables
// stay in sync within the same session without a manual page reload.
export const SCHOOL_DATA_CHANGED_EVENT = 'schoolData:changed'
