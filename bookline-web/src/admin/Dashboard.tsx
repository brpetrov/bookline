import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { BarChart, Donut } from '../components/charts'
import { dayName, money, todayIso } from '../lib/format'
import { shiftWeek, weekOf } from '../lib/calendar'
import { PageHeader } from './AdminLayout'

const FALLBACK_COLOURS = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#64748b']

export function Dashboard() {
  const [anchor, setAnchor] = useState(todayIso)

  const week = useMemo(() => weekOf(anchor), [anchor])
  const fromUtc = `${week[0]}T00:00:00Z`
  const toUtc = `${shiftWeek(week[0]!, 1)}T00:00:00Z`

  const { data, isPending, error } = useQuery({
    queryKey: ['dashboard', fromUtc, toUtc],
    queryFn: () => adminApi.dashboard(fromUtc, toUtc),
  })

  const { data: services } = useQuery({ queryKey: ['services'], queryFn: adminApi.services })

  const colourFor = (name: string, index: number) =>
    services?.find((s) => s.name === name)?.colour ??
    FALLBACK_COLOURS[index % FALLBACK_COLOURS.length]!

  const perDay = useMemo(() => {
    const counts = new Map(data?.bookingsPerDay.map((d) => [d.date, d.count]) ?? [])
    return week.map((day) => ({ label: dayName(day), value: counts.get(day) ?? 0 }))
  }, [week, data])

  const isThisWeek = week.includes(todayIso())

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={isThisWeek ? 'This week' : `Week of ${week[0]}`}
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
              This week
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

      <div className="space-y-5 p-6">
        {error && (
          <p className="rounded-xl bg-white p-4 text-sm text-rose-600 ring-1 ring-rose-200">
            {error.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Bookings" value={isPending ? null : String(data!.bookings)} />
          <Tile label="Revenue" value={isPending ? null : money(data!.revenuePence)} />
          <Tile
            label="Utilisation"
            value={isPending ? null : `${data!.utilisationPercent}%`}
            hint={isPending ? undefined : 'of staffed hours booked'}
          />
          <Tile
            label="Cancellations"
            value={isPending ? null : String(data!.cancellationCount)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Bookings per day">
            {isPending ? <Skeleton height={180} /> : <BarChart data={perDay} />}
          </Card>

          <Card title="Service mix">
            {isPending ? (
              <Skeleton height={180} />
            ) : data!.topServices.length === 0 ? (
              <Empty message="No bookings this week" />
            ) : (
              <Donut
                data={data!.topServices.map((service, index) => ({
                  label: service.name,
                  value: service.count,
                  colour: colourFor(service.name, index),
                }))}
              />
            )}
          </Card>
        </div>

        <Card title="Top services by revenue">
          {isPending ? (
            <Skeleton height={140} />
          ) : data!.topServices.length === 0 ? (
            <Empty message="Nothing booked this week" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Service</th>
                  <th className="pb-2 text-right font-semibold">Bookings</th>
                  <th className="pb-2 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...data!.topServices]
                  .sort((a, b) => b.valuePence - a.valuePence)
                  .map((service, index) => (
                    <tr key={service.name} className="border-t border-slate-100">
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: colourFor(service.name, index) }}
                          />
                          <span className="font-medium text-slate-900">{service.name}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600">
                        {service.count}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums text-slate-900">
                        {money(service.valuePence)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  )
}

function Tile({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {value === null ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function Skeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-lg bg-slate-100" style={{ height }} />
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center text-center">
      <span className="text-2xl text-slate-300">◔</span>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  )
}
