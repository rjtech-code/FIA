// All "current date" derivation is pinned to Asia/Kolkata (IST) explicitly.
// A Node process's host timezone is not guaranteed (e.g. a VPS running in
// UTC) — deriving month/financial-year from a naive `new Date()` would
// mis-file a submission made at, say, 00:30 IST on April 1st as March 31st
// UTC, silently attributing it to the wrong financial year. The exported
// functions still accept an optional `date` override (tests / historical
// backfills), but default to "right now, as seen from IST".
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const IST_TIME_ZONE = 'Asia/Kolkata'

// Returns {year, month(1-12)} as seen in Asia/Kolkata, regardless of the
// runtime's own timezone.
function getIstYearMonth(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return { year, month }
}

export function getCurrentMonthName(date = new Date()) {
  const { month } = getIstYearMonth(date)
  return MONTH_NAMES[month - 1]
}

// Calendar month name (as stamped on feedback/batch documents by
// getCurrentMonthName above) -> 1-12 numeric code. Used by the AFE CSV
// (Official) export, which requires month_name to be numeric, never a name.
// Returns '' for an unrecognized/missing month rather than throwing, so a
// stray/legacy value never crashes export generation.
export function getMonthNumber(monthName) {
  const index = MONTH_NAMES.indexOf(monthName)
  return index === -1 ? '' : index + 1
}

// Indian financial year: April–March, formatted like "2026-27".
export function getCurrentFinancialYear(date = new Date()) {
  const { year, month } = getIstYearMonth(date)
  const startYear = month >= 4 ? year : year - 1
  const endYearSuffix = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endYearSuffix}`
}
