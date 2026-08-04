import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import type { Appointment, AppointmentStatus, StaffAdmin } from '../api/adminTypes'
import { money, salonDateLong, salonTime } from '../lib/format'
import { STATUS_STYLES } from '../lib/calendar'
import { Avatar } from '../components/Avatar'

const STATUSES: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'NoShow', 'Cancelled']

export function AppointmentDrawer({
  appointment,
  staff,
  onClose,
}: {
  appointment: Appointment
  staff: StaffAdmin[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState(appointment.notes ?? '')

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateAppointment>[1]) =>
      adminApi.updateAppointment(appointment.id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const cancel = useMutation({
    mutationFn: () => adminApi.cancelAppointment(appointment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onClose()
    },
  })

  const status = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.Confirmed!

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-slate-900/20"
        onClick={onClose}
        aria-hidden
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-900">
              {appointment.customerName}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {salonDateLong(appointment.startsAtUtc)} ·{' '}
              {salonTime(appointment.startsAtUtc)}–{salonTime(appointment.endsAtUtc)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span
              className="h-10 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: appointment.serviceColour }}
            />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{appointment.serviceName}</p>
              <p className="text-sm text-slate-500">{appointment.durationMinutes} min</p>
            </div>
            <p className="font-semibold tabular-nums text-slate-900">
              {money(appointment.pricePence)}
            </p>
          </div>

          <Field label="Status">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((option) => {
                const active = appointment.status === option
                const style = STATUS_STYLES[option]!
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => patch.mutate({ status: option })}
                    className={
                      'rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition disabled:opacity-50 ' +
                      (active
                        ? `bg-white ${style.ring} ${style.text}`
                        : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300')
                    }
                  >
                    {style.label}
                  </button>
                )
              })}
            </div>
            <p className={'mt-2 text-xs ' + status.text}>Currently {status.label.toLowerCase()}</p>
          </Field>

          <Field label="Stylist">
            <div className="space-y-2">
              {staff.map((member) => {
                const active = member.id === appointment.staffId
                const canDo = member.serviceIds.includes(appointment.serviceId)
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={!canDo || active || patch.isPending}
                    onClick={() => patch.mutate({ staffId: member.id })}
                    className={
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left ring-1 transition ' +
                      (active
                        ? 'bg-indigo-50 ring-indigo-200'
                        : canDo
                          ? 'bg-white ring-slate-200 hover:ring-indigo-300'
                          : 'cursor-not-allowed bg-slate-50 ring-slate-100 opacity-60')
                    }
                  >
                    <Avatar name={member.name} colour={member.colour} avatarUrl={member.avatarUrl} />
                    <span className="flex-1 text-sm font-medium text-slate-900">{member.name}</span>
                    {active && <span className="text-xs font-medium text-indigo-700">Assigned</span>}
                    {!canDo && !active && (
                      <span className="text-xs text-slate-400">Doesn’t offer this</span>
                    )}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Customer">
            <dl className="space-y-1 text-sm">
              <Row label="Email" value={appointment.customerEmail} />
              <Row label="Phone" value={appointment.customerPhone} />
              <Row label="Reference" value={`#${appointment.id}`} />
            </dl>
          </Field>

          <Field label="Notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (notes !== (appointment.notes ?? '')) {
                  patch.mutate({ notes })
                }
              }}
              placeholder="Anything the stylist should know"
              className="w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </Field>

          {patch.isError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {patch.error.message}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 p-5">
          <button
            type="button"
            disabled={cancel.isPending || appointment.status === 'Cancelled'}
            onClick={() => cancel.mutate()}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {appointment.status === 'Cancelled' ? 'Already cancelled' : 'Cancel appointment'}
          </button>
        </footer>
      </aside>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-900">{value}</dd>
    </div>
  )
}
