import { SALON_TZ } from './format'

/** Grid geometry. The salon opens 08:30 at the earliest and closes 20:00 at the latest. */
export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 21
export const PX_PER_MINUTE = 0.95
export const SNAP_MINUTES = 15

export const GRID_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60
export const GRID_HEIGHT = GRID_MINUTES * PX_PER_MINUTE

/** Wall-clock parts of an instant, in salon time. */
export function salonParts(isoUtc: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoUtc))

  const get = (type: string) => parts.find((p) => p.type === type)!.value

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

/** Minutes from the top of the grid for an instant. */
export function offsetMinutes(isoUtc: string) {
  const { hour, minute } = salonParts(isoUtc)
  return (hour - DAY_START_HOUR) * 60 + minute
}

/** Monday-first week containing the given "YYYY-MM-DD". */
export function weekOf(date: string): string[] {
  const anchor = new Date(`${date}T12:00:00Z`)
  const shift = (anchor.getUTCDay() + 6) % 7
  anchor.setUTCDate(anchor.getUTCDate() - shift)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(anchor)
    day.setUTCDate(day.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

export function shiftWeek(date: string, weeks: number) {
  const anchor = new Date(`${date}T12:00:00Z`)
  anchor.setUTCDate(anchor.getUTCDate() + weeks * 7)
  return anchor.toISOString().slice(0, 10)
}

/**
 * Converts a salon-local date + minutes-from-grid-top back into a UTC instant.
 * Finds the offset empirically rather than hard-coding BST/GMT.
 */
export function toUtcInstant(date: string, minutesFromTop: number): string {
  const hour = DAY_START_HOUR + Math.floor(minutesFromTop / 60)
  const minute = minutesFromTop % 60
  const wall = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  // Guess UTC, then correct by however far the salon-local reading drifts.
  let guess = new Date(`${wall}:00Z`)
  for (let i = 0; i < 3; i++) {
    const parts = salonParts(guess.toISOString())
    const seen = (parts.hour - DAY_START_HOUR) * 60 + parts.minute
    const drift = minutesFromTop - seen
    if (parts.date === date && drift === 0) {
      break
    }
    guess = new Date(guess.getTime() + drift * 60_000)
  }

  return guess.toISOString()
}

/** Side-by-side lanes so simultaneous appointments don't cover each other. */
export function assignLanes<T extends { startsAtUtc: string; endsAtUtc: string }>(items: T[]) {
  const sorted = [...items].sort(
    (a, b) => Date.parse(a.startsAtUtc) - Date.parse(b.startsAtUtc),
  )

  const laneEnds: number[] = []
  const placed = sorted.map((item) => {
    const start = Date.parse(item.startsAtUtc)
    const end = Date.parse(item.endsAtUtc)

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
    }
    laneEnds[lane] = end

    return { item, lane }
  })

  return { placed, laneCount: Math.max(1, laneEnds.length) }
}

export const STATUS_STYLES: Record<string, { ring: string; text: string; label: string }> = {
  Confirmed: { ring: 'ring-emerald-300', text: 'text-emerald-700', label: 'Confirmed' },
  Pending: { ring: 'ring-amber-300', text: 'text-amber-700', label: 'Pending' },
  Completed: { ring: 'ring-slate-300', text: 'text-slate-600', label: 'Completed' },
  Cancelled: { ring: 'ring-slate-200', text: 'text-slate-400', label: 'Cancelled' },
  NoShow: { ring: 'ring-rose-300', text: 'text-rose-700', label: 'No show' },
}
