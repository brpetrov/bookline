import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { PageHeader } from './AdminLayout'

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

type Row = { open: boolean; openTime: string; closeTime: string }

const CLOSED: Row = { open: false, openTime: '09:00', closeTime: '17:00' }

export function HoursPage() {
  const queryClient = useQueryClient()
  const { data: hours, isPending } = useQuery({
    queryKey: ['opening-hours'],
    queryFn: adminApi.openingHours,
  })

  const [rows, setRows] = useState<Record<number, Row>>({})

  useEffect(() => {
    if (!hours) {
      return
    }
    const next: Record<number, Row> = {}
    for (const day of DAYS) {
      const match = hours.find((h) => h.dayOfWeek === day.value)
      next[day.value] = match
        ? { open: true, openTime: match.openTime, closeTime: match.closeTime }
        : { ...CLOSED }
    }
    setRows(next)
  }, [hours])

  const save = useMutation({
    mutationFn: () =>
      adminApi.saveOpeningHours(
        DAYS.filter((day) => rows[day.value]?.open).map((day) => ({
          dayOfWeek: day.value,
          openTime: rows[day.value]!.openTime,
          closeTime: rows[day.value]!.closeTime,
        })),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opening-hours'] }),
  })

  const update = (day: number, patch: Partial<Row>) =>
    setRows((current) => ({ ...current, [day]: { ...current[day]!, ...patch } }))

  return (
    <>
      <PageHeader
        title="Opening hours"
        subtitle="When the salon is open for bookings"
        action={
          <button
            type="button"
            disabled={save.isPending || isPending}
            onClick={() => save.mutate()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        }
      />

      <div className="p-6">
        {save.isError && (
          <p className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && (
          <p className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Opening hours saved.
          </p>
        )}

        <div className="max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {isPending
            ? [0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 animate-pulse border-t border-slate-100 bg-slate-50" />
              ))
            : DAYS.map((day) => {
                const row = rows[day.value] ?? CLOSED
                return (
                  <div
                    key={day.value}
                    className="flex items-center gap-4 border-t border-slate-100 px-4 py-3 first:border-t-0"
                  >
                    <label className="flex w-40 items-center gap-2.5 text-sm font-medium text-slate-900">
                      <input
                        type="checkbox"
                        checked={row.open}
                        onChange={(e) => update(day.value, { open: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      {day.label}
                    </label>

                    {row.open ? (
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="time"
                          value={row.openTime}
                          onChange={(e) => update(day.value, { openTime: e.target.value })}
                          className="rounded-lg px-2.5 py-1.5 tabular-nums text-slate-900 ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={row.closeTime}
                          onChange={(e) => update(day.value, { closeTime: e.target.value })}
                          className="rounded-lg px-2.5 py-1.5 tabular-nums text-slate-900 ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Closed</span>
                    )}
                  </div>
                )
              })}
        </div>

        <p className="mt-3 max-w-2xl text-xs text-slate-500">
          Bookable slots are the overlap of these hours with each stylist’s shift, minus time
          off, existing appointments and turnaround buffers.
        </p>
      </div>
    </>
  )
}
