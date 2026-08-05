import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AvailableSlot, BusinessProfile, Service, Staff } from '../api/types'
import { dayOfWeek, money, salonDateLong, salonTime, todayIso } from '../lib/format'

/**
 * Shopfront details. The Business entity models scheduling - name, timezone, slug -
 * so the address and phone are presentation-only, alongside the opening hours the
 * API does return.
 */
const CONTACT = {
  address: '14 Kirkgate, Leeds LS1 6BY',
  phone: '0113 496 0114',
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PROMISES = [
  'Instant confirmation',
  'Free to change or cancel up to 24 hours before',
  'No card needed — pay in the salon',
]

export function SalonPanel({
  business,
  service,
  stylist,
  slot,
}: {
  business: BusinessProfile | undefined
  service: Service | null
  stylist: Staff | null
  slot: AvailableSlot | null
}) {
  const today = dayOfWeek(todayIso())
  const hoursFor = (day: number) => business?.openingHours.find((h) => h.dayOfWeek === day)

  // Cached by StaffStep. In "anyone" mode the chosen slot names the stylist, so the
  // summary can say who it will be instead of leaving it vague.
  const { data: staff } = useQuery({
    queryKey: ['staff', service?.id],
    queryFn: () => api.staff(service!.id),
    enabled: service !== null,
  })

  const assigned = stylist ?? (slot ? staff?.find((m) => m.id === slot.staffId) : undefined)

  return (
    <div className="space-y-4">
      {service && (
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Your booking</h2>

          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Service" value={service.name} />
            <Row label="Length" value={`${service.durationMinutes} min`} />
            <Row label="Stylist" value={assigned ? assigned.name : 'Anyone available'} />
            <Row
              label="When"
              value={slot ? `${salonDateLong(slot.startsAtUtc)}, ${salonTime(slot.startsAtUtc)}` : '—'}
            />
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-semibold tabular-nums tracking-tight text-slate-900">
              {money(service.pricePence)}
            </span>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Opening hours</h2>

        <dl className="mt-3 space-y-1.5 text-sm">
          {/* Monday first - the API returns Sunday-first DayOfWeek values. */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const hours = hoursFor(day)
            const isToday = day === today

            return (
              <div
                key={day}
                className={
                  'flex justify-between gap-4 ' +
                  (isToday ? 'font-medium text-slate-900' : 'text-slate-500')
                }
              >
                <dt>
                  {DAY_NAMES[day]}
                  {isToday && <span className="ml-1.5 text-xs text-indigo-600">Today</span>}
                </dt>
                <dd className="tabular-nums">
                  {hours ? `${hours.openTime} – ${hours.closeTime}` : 'Closed'}
                </dd>
              </div>
            )
          })}
        </dl>

        <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
          <p>{CONTACT.address}</p>
          <p className="tabular-nums">{CONTACT.phone}</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <ul className="space-y-2.5 text-sm text-slate-600">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700"
              >
                ✓
              </span>
              {promise}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
