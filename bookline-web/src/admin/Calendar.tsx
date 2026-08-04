import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import type { Appointment } from '../api/adminTypes'
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  GRID_HEIGHT,
  GRID_MINUTES,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  STATUS_STYLES,
  assignLanes,
  offsetMinutes,
  salonParts,
  shiftWeek,
  toUtcInstant,
  weekOf,
} from '../lib/calendar'
import { dayName, dayNumber, money, salonTime, todayIso } from '../lib/format'
import { PageHeader } from './AdminLayout'
import { AppointmentDrawer } from './AppointmentDrawer'

type Drag = {
  id: number
  pointerId: number
  startClientY: number
  originMinutes: number
  originDate: string
  minutes: number
  date: string
}

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay()

export function Calendar() {
  const [anchor, setAnchor] = useState(todayIso)
  const [staffFilter, setStaffFilter] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const week = useMemo(() => weekOf(anchor), [anchor])
  const fromUtc = `${week[0]}T00:00:00Z`
  const toUtc = `${shiftWeek(week[0]!, 1)}T00:00:00Z`

  const { data: appointments, isPending } = useQuery({
    queryKey: ['appointments', fromUtc, toUtc],
    queryFn: () => adminApi.appointments(fromUtc, toUtc),
  })

  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: adminApi.staff })
  const { data: openingHours } = useQuery({
    queryKey: ['opening-hours'],
    queryFn: adminApi.openingHours,
  })

  const reschedule = useMutation({
    mutationFn: ({ id, startsAtUtc }: { id: number; startsAtUtc: string }) =>
      adminApi.updateAppointment(id, { startsAtUtc }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const visible = useMemo(
    () => (appointments ?? []).filter((a) => staffFilter === null || a.staffId === staffFilter),
    [appointments, staffFilter],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const day of week) {
      map.set(day, [])
    }
    for (const appointment of visible) {
      map.get(salonParts(appointment.startsAtUtc).date)?.push(appointment)
    }
    return map
  }, [week, visible])

  // Closed days would be dead columns. Drop them unless something is booked anyway.
  const days = useMemo(() => {
    if (!openingHours) {
      return week
    }
    const open = new Set(openingHours.map((h) => h.dayOfWeek))
    const shown = week.filter(
      (day) => open.has(weekdayOf(day)) || (byDay.get(day)?.length ?? 0) > 0,
    )
    return shown.length > 0 ? shown : week
  }, [week, openingHours, byDay])

  const selected = appointments?.find((a) => a.id === selectedId) ?? null

  const beginDrag = (event: React.PointerEvent, appointment: Appointment) => {
    if (appointment.status === 'Cancelled') {
      return
    }
    const { date } = salonParts(appointment.startsAtUtc)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: appointment.id,
      pointerId: event.pointerId,
      startClientY: event.clientY,
      originMinutes: offsetMinutes(appointment.startsAtUtc),
      originDate: date,
      minutes: offsetMinutes(appointment.startsAtUtc),
      date,
    })
  }

  const moveDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return
    }

    const deltaMinutes = (event.clientY - drag.startClientY) / PX_PER_MINUTE
    const snapped = Math.round((drag.originMinutes + deltaMinutes) / SNAP_MINUTES) * SNAP_MINUTES

    let date = drag.date
    const grid = gridRef.current
    if (grid) {
      const rect = grid.getBoundingClientRect()
      const index = Math.floor(((event.clientX - rect.left) / rect.width) * days.length)
      if (index >= 0 && index < days.length) {
        date = days[index]!
      }
    }

    setDrag({ ...drag, minutes: Math.max(0, Math.min(GRID_MINUTES - 15, snapped)), date })
  }

  const endDrag = () => {
    if (!drag) {
      return
    }
    if (drag.minutes !== drag.originMinutes || drag.date !== drag.originDate) {
      reschedule.mutate({ id: drag.id, startsAtUtc: toUtcInstant(drag.date, drag.minutes) })
    } else {
      setSelectedId(drag.id)
    }
    setDrag(null)
  }

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)
  const today = todayIso()

  const nowMinutes = (() => {
    const parts = salonParts(new Date().toISOString())
    return (parts.hour - DAY_START_HOUR) * 60 + parts.minute
  })()

  const weekRevenue = visible
    .filter((a) => a.status !== 'Cancelled')
    .reduce((sum, a) => sum + a.pricePence, 0)

  return (
    <>
      <PageHeader
        title="Week calendar"
        subtitle={`${visible.length} appointments · ${money(weekRevenue)}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchor(shiftWeek(anchor, -1))}
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
              aria-label="Previous week"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setAnchor(todayIso())}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setAnchor(shiftWeek(anchor, 1))}
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
              aria-label="Next week"
            >
              →
            </button>
          </div>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStaffFilter(null)}
            className={
              'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ' +
              (staffFilter === null
                ? 'bg-slate-900 text-white ring-slate-900'
                : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')
            }
          >
            Everyone
          </button>
          {staff
            ?.filter((member) => member.isActive)
            .map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setStaffFilter(member.id === staffFilter ? null : member.id)}
                className={
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ' +
                  (staffFilter === member.id
                    ? 'bg-white text-slate-900 ring-slate-400'
                    : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: member.colour }}
                />
                {member.name}
              </button>
            ))}
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex border-b border-slate-200">
            <div className="w-14 shrink-0" />
            {days.map((day) => (
              <div
                key={day}
                className={
                  'flex-1 border-l border-slate-100 px-2 py-2 text-center ' +
                  (day === today ? 'bg-indigo-50/60' : '')
                }
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{dayName(day)}</p>
                <p
                  className={
                    'text-sm font-semibold tabular-nums ' +
                    (day === today ? 'text-indigo-700' : 'text-slate-900')
                  }
                >
                  {dayNumber(day)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="w-14 shrink-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: 60 * PX_PER_MINUTE }}
                  className="relative border-t border-slate-100 first:border-t-0"
                >
                  <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-slate-400">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            <div
              ref={gridRef}
              className="relative flex flex-1"
              style={{ height: GRID_HEIGHT }}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {days.map((day) => {
                const items = byDay.get(day) ?? []
                const { placed, laneCount } = assignLanes(items)

                return (
                  <div
                    key={day}
                    className={
                      'relative flex-1 border-l border-slate-100 ' +
                      (day === today ? 'bg-indigo-50/30' : '')
                    }
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: 60 * PX_PER_MINUTE }}
                        className="border-t border-slate-100 first:border-t-0"
                      />
                    ))}

                    {day === today && nowMinutes >= 0 && nowMinutes <= GRID_MINUTES && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-500"
                        style={{ top: nowMinutes * PX_PER_MINUTE }}
                      >
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                      </div>
                    )}

                    {placed.map(({ item, lane }) => {
                      const dragging = drag?.id === item.id
                      const minutes = dragging ? drag.minutes : offsetMinutes(item.startsAtUtc)
                      const duration =
                        (Date.parse(item.endsAtUtc) - Date.parse(item.startsAtUtc)) / 60_000
                      const height = Math.max(18, duration * PX_PER_MINUTE - 2)
                      const hidden = dragging && drag.date !== day
                      const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.Confirmed!
                      const roomy = height >= 34
                      const firstName = item.customerName.split(' ')[0]

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onPointerDown={(event) => beginDrag(event, item)}
                          className={
                            'absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ring-1 ' +
                            style.ring +
                            (item.status === 'Cancelled'
                              ? ' opacity-40 line-through'
                              : ' cursor-grab active:cursor-grabbing') +
                            (dragging ? ' z-40 shadow-lg ring-2' : ' hover:z-30 hover:shadow-md')
                          }
                          style={{
                            top: minutes * PX_PER_MINUTE,
                            height,
                            // Lanes overlap slightly so each block stays readable.
                            left: `calc(${(lane * 100) / laneCount}% + 1px)`,
                            width:
                              laneCount > 1
                                ? `calc(${100 / laneCount}% + ${Math.min(26, 34 - laneCount * 4)}px)`
                                : 'calc(100% - 4px)',
                            // Never let the widened block spill out of the day column.
                            maxWidth: `calc(${100 - (lane * 100) / laneCount}% - 4px)`,
                            zIndex: dragging ? 40 : 10 + lane,
                            backgroundColor: `${item.staffColour}26`,
                            borderLeft: `3px solid ${item.staffColour}`,
                            display: hidden ? 'none' : undefined,
                          }}
                          title={`${salonTime(item.startsAtUtc)} ${item.customerName} · ${item.serviceName} · ${style.label}`}
                        >
                          <span className="block truncate font-semibold text-slate-800">
                            {roomy ? `${salonTime(item.startsAtUtc)} ${firstName}` : firstName}
                          </span>
                          {roomy && (
                            <span className="block truncate text-slate-500">{item.serviceName}</span>
                          )}
                        </button>
                      )
                    })}

                    {drag && drag.date === day && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-50 flex justify-center"
                        style={{ top: drag.minutes * PX_PER_MINUTE - 18 }}
                      >
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                          {String(DAY_START_HOUR + Math.floor(drag.minutes / 60)).padStart(2, '0')}:
                          {String(drag.minutes % 60).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {isPending && <p className="mt-3 text-sm text-slate-400">Loading week…</p>}
        {reschedule.isError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {reschedule.error.message}
          </p>
        )}
      </div>

      {selected && staff && (
        <AppointmentDrawer
          appointment={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
