import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import type { StaffAdmin } from '../api/adminTypes'
import type { Service } from '../api/types'
import { initials, money, todayIso } from '../lib/format'
import { shiftWeek, weekOf } from '../lib/calendar'
import { PageHeader } from './AdminLayout'
import { Modal } from '../components/Modal'

type Draft = {
  id: number | null
  name: string
  durationMinutes: number
  pricePence: number
  colour: string
  bufferMinutes: number
}

const BLANK: Draft = {
  id: null,
  name: '',
  durationMinutes: 30,
  pricePence: 2500,
  colour: '#4f46e5',
  bufferMinutes: 5,
}

const PALETTE = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#64748b']

export function ServicesPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data: services, isPending } = useQuery({
    queryKey: ['services'],
    queryFn: adminApi.services,
  })

  // Who can perform each service, and how each one is selling this week - both
  // already come from endpoints the calendar and dashboard use.
  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: adminApi.staff })

  const week = useMemo(() => weekOf(todayIso()), [])
  const { data: summary } = useQuery({
    queryKey: ['dashboard', `${week[0]}T00:00:00Z`, `${shiftWeek(week[0]!, 1)}T00:00:00Z`],
    queryFn: () => adminApi.dashboard(`${week[0]}T00:00:00Z`, `${shiftWeek(week[0]!, 1)}T00:00:00Z`),
  })

  const thisWeek = (name: string) => summary?.topServices.find((s) => s.name === name)

  const save = useMutation({
    mutationFn: (value: Draft) =>
      adminApi.saveService(value.id, {
        name: value.name,
        durationMinutes: value.durationMinutes,
        pricePence: value.pricePence,
        colour: value.colour,
        bufferMinutes: value.bufferMinutes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setDraft(null)
    },
  })

  const remove = useMutation({
    mutationFn: adminApi.deleteService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })

  return (
    <>
      <PageHeader
        title="Services"
        subtitle={services ? `${services.length} services` : undefined}
        action={
          <button
            type="button"
            onClick={() => setDraft(BLANK)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            New service
          </button>
        }
      />

      <div className="space-y-5 p-6">
        {remove.isError && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            {remove.error.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Services" value={services ? String(services.length) : null} />
          <Tile
            label="Duration"
            value={
              services?.length
                ? `${Math.min(...services.map((s) => s.durationMinutes))}–${Math.max(
                    ...services.map((s) => s.durationMinutes),
                  )} min`
                : null
            }
            hint="shortest to longest"
          />
          <Tile
            label="Average price"
            value={
              services?.length
                ? money(
                    Math.round(
                      services.reduce((total, s) => total + s.pricePence, 0) / services.length,
                    ),
                  )
                : null
            }
          />
          <Tile
            label="Booked this week"
            value={summary ? String(summary.bookings) : null}
            hint={summary ? money(summary.revenuePence) : undefined}
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {isPending ? (
            <div className="space-y-px">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-slate-50" />
              ))}
            </div>
          ) : services!.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl text-slate-300">✂</span>
              <p className="mt-2 text-sm font-medium text-slate-900">No services yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add the treatments customers can book.
              </p>
              <button
                type="button"
                onClick={() => setDraft(BLANK)}
                className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                New service
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Who can do it</th>
                  <th className="px-5 py-3 text-right font-semibold">Duration</th>
                  <th className="px-5 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">This week</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {services!.map((service) => {
                  const week = thisWeek(service.name)

                  return (
                  <tr key={service.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-3">
                        <span
                          className="h-9 w-1.5 rounded-full"
                          style={{ backgroundColor: service.colour }}
                        />
                        <span>
                          <span className="block font-medium text-slate-900">{service.name}</span>
                          <span className="block text-xs text-slate-400">
                            {service.pricePence === 0
                              ? 'Free consultation'
                              : `${money(Math.round((service.pricePence / service.durationMinutes) * 60))} an hour`}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <TeamChips service={service} staff={staff} />
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                      {service.durationMinutes} min
                    </td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-900">
                      {money(service.pricePence)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {week ? (
                        <>
                          <span className="block tabular-nums text-slate-900">
                            {week.count} booked
                          </span>
                          <span className="block text-xs tabular-nums text-slate-400">
                            {money(week.valuePence)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            id: service.id,
                            name: service.name,
                            durationMinutes: service.durationMinutes,
                            pricePence: service.pricePence,
                            colour: service.colour,
                            bufferMinutes: 5,
                          })
                        }
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate(service.id)}
                        className="ml-2 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">How these become bookable slots</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Note title="Every 15 minutes">
              Start times are offered on a quarter-hour grid inside the salon's opening hours.
            </Note>
            <Note title="Only who can do it">
              A time appears only if a stylist assigned to that service is on shift and not on
              time off.
            </Note>
            <Note title="Buffer after each one">
              A service's buffer blocks the diary after the appointment ends, so back-to-back
              bookings stay realistic.
            </Note>
          </div>
        </section>
      </div>

      {draft && (
        <Modal
          title={draft.id === null ? 'New service' : 'Edit service'}
          onClose={() => setDraft(null)}
          onSubmit={() => save.mutate(draft)}
          busy={save.isPending}
          error={save.isError ? save.error.message : null}
        >
          <Labelled label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputClass}
            />
          </Labelled>

          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Duration (min)">
              <input
                type="number"
                min={5}
                step={5}
                value={draft.durationMinutes}
                onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
                className={inputClass}
              />
            </Labelled>
            <Labelled label="Buffer (min)">
              <input
                type="number"
                min={0}
                step={5}
                value={draft.bufferMinutes}
                onChange={(e) => setDraft({ ...draft, bufferMinutes: Number(e.target.value) })}
                className={inputClass}
              />
            </Labelled>
          </div>

          <Labelled label="Price (£)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={(draft.pricePence / 100).toFixed(2)}
              onChange={(e) =>
                setDraft({ ...draft, pricePence: Math.round(Number(e.target.value) * 100) })
              }
              className={inputClass}
            />
          </Labelled>

          <Labelled label="Colour">
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setDraft({ ...draft, colour })}
                  aria-label={colour}
                  className={
                    'h-8 w-8 rounded-lg ring-2 transition ' +
                    (draft.colour === colour ? 'ring-slate-900' : 'ring-transparent')
                  }
                  style={{ backgroundColor: colour }}
                />
              ))}
            </div>
          </Labelled>
        </Modal>
      )}
    </>
  )
}

function Tile({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {value === null ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{children}</p>
    </div>
  )
}

function TeamChips({ service, staff }: { service: Service; staff: StaffAdmin[] | undefined }) {
  const performers = staff?.filter((m) => m.isActive && m.serviceIds.includes(service.id)) ?? []

  if (staff && performers.length === 0) {
    return <span className="text-xs text-amber-600">Nobody assigned</span>
  }

  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {performers.map((member) => (
          <span
            key={member.id}
            title={member.name}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white"
            style={{ backgroundColor: member.colour }}
          >
            {initials(member.name)}
          </span>
        ))}
      </span>
      <span className="text-xs text-slate-400">
        {performers.length === 1 ? performers[0]!.name : `${performers.length} stylists`}
      </span>
    </span>
  )
}

export const inputClass =
  'w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

export function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export type { Service }
