/**
 * The salon's own timezone. Customers must see Leeds opening times regardless of
 * where they are browsing from, so we never format in the browser's local zone.
 */
export const SALON_TZ = 'Europe/London'

export const money = (pence: number) =>
  pence === 0
    ? 'Free'
    : (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })

/** "13:30" — an instant, rendered in salon time. */
export const salonTime = (isoUtc: string) =>
  new Date(isoUtc).toLocaleTimeString('en-GB', {
    timeZone: SALON_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })

/** "Thursday 6 August" — an instant, rendered in salon time. */
export const salonDateLong = (isoUtc: string) =>
  new Date(isoUtc).toLocaleDateString('en-GB', {
    timeZone: SALON_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

/**
 * Formats a plain "2026-08-06" calendar date. Parsed at midday UTC on purpose:
 * "2026-08-06T00:00:00Z" would render as the 5th anywhere west of Greenwich.
 */
export const plainDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options })

export const dayName = (date: string) => plainDate(date, { weekday: 'short' })

export const dayNumber = (date: string) => plainDate(date, { day: 'numeric' })

export const monthName = (date: string) => plainDate(date, { month: 'short' })

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

/** Local calendar date as "YYYY-MM-DD", for the availability query. */
export const todayIso = () => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts
}

export const addDaysIso = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
