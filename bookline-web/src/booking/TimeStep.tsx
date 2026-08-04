import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AvailableSlot, Service } from '../api/types'
import { addDaysIso, dayName, dayNumber, monthName, salonTime, todayIso } from '../lib/format'

export function TimeStep({
  service,
  staffId,
  onPick,
}: {
  service: Service
  staffId: number | null
  onPick: (slot: AvailableSlot) => void
}) {
  const from = todayIso()
  const to = addDaysIso(from, 13)

  const { data: days, isPending, error } = useQuery({
    queryKey: ['availability', service.id, staffId, from, to],
    queryFn: () => api.availability(service.id, from, to, staffId ?? undefined),
  })

  // Cached from StaffStep — no second request.
  const { data: staff } = useQuery({
    queryKey: ['staff', service.id],
    queryFn: () => api.staff(service.id),
  })

  const [chosenDate, setChosenDate] = useState<string | null>(null)

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-rose-600 ring-1 ring-rose-200">
        Couldn’t load availability — {error.message}
      </p>
    )
  }

  const open = days?.filter((day) => day.slots.length > 0) ?? []

  if (open.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-900">Nothing available</p>
        <p className="mt-1 text-sm text-slate-500">
          There are no free times in the next two weeks. Try another stylist.
        </p>
      </div>
    )
  }

  const activeDate = chosenDate && open.some((d) => d.date === chosenDate) ? chosenDate : open[0]!.date
  const activeDay = open.find((day) => day.date === activeDate)!

  // In "anyone" mode several stylists can offer the same time — show each time once.
  const seen = new Set<string>()
  const slots = activeDay.slots.filter((slot) => {
    if (seen.has(slot.startsAtUtc)) {
      return false
    }
    seen.add(slot.startsAtUtc)
    return true
  })

  const staffName = (id: number) => staff?.find((member) => member.id === id)?.name

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {open.map((day) => {
          const active = day.date === activeDate
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setChosenDate(day.date)}
              className={
                'flex shrink-0 flex-col items-center rounded-xl px-4 py-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
                (active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300')
              }
            >
              <span className={active ? 'text-indigo-100' : 'text-slate-400'}>
                {dayName(day.date)}
              </span>
              <span className="text-lg font-semibold tabular-nums">{dayNumber(day.date)}</span>
              <span className={active ? 'text-indigo-100' : 'text-slate-400'}>
                {monthName(day.date)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot.startsAtUtc}
              type="button"
              onClick={() => onPick(slot)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="block tabular-nums">{salonTime(slot.startsAtUtc)}</span>
              {staffId === null && (
                <span className="block text-xs font-normal text-slate-400">
                  {staffName(slot.staffId)?.split(' ')[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
