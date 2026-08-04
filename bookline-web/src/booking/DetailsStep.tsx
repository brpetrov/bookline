import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../api/client'
import type { AvailableSlot, BookingConfirmation, Service } from '../api/types'
import { money, salonDateLong, salonTime } from '../lib/format'

type Fields = {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
}

const LABELS: Record<keyof Fields, string> = {
  customerName: 'Your name',
  customerEmail: 'Email',
  customerPhone: 'Phone',
  notes: 'Anything we should know? (optional)',
}

export function DetailsStep({
  service,
  slot,
  onBooked,
  onSlotTaken,
}: {
  service: Service
  slot: AvailableSlot
  onBooked: (confirmation: BookingConfirmation) => void
  onSlotTaken: () => void
}) {
  const [fields, setFields] = useState<Fields>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  })

  const queryClient = useQueryClient()

  const booking = useMutation({
    mutationFn: api.book,
    onSuccess: (confirmation) => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      onBooked(confirmation)
    },
  })

  const problem = booking.error instanceof ApiError ? booking.error : null
  const fieldErrors = problem?.problem.errors ?? {}

  // FluentValidation keys are PascalCase ("CustomerName"); our fields are camelCase.
  const errorFor = (field: keyof Fields) => {
    const key = field.charAt(0).toUpperCase() + field.slice(1)
    return fieldErrors[key]?.[0]
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    booking.mutate({
      serviceId: service.id,
      staffId: slot.staffId,
      startsAtUtc: slot.startsAtUtc,
      customerName: fields.customerName,
      customerEmail: fields.customerEmail,
      customerPhone: fields.customerPhone,
      notes: fields.notes || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="font-medium text-slate-900">{service.name}</p>
        <p className="mt-1 text-sm text-slate-500">
          {salonDateLong(slot.startsAtUtc)} at {salonTime(slot.startsAtUtc)} ·{' '}
          {service.durationMinutes} min · {money(service.pricePence)}
        </p>
      </div>

      {problem?.status === 409 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
          <p className="font-medium text-amber-900">That time has just been taken.</p>
          <button
            type="button"
            onClick={onSlotTaken}
            className="mt-2 font-medium text-amber-900 underline"
          >
            Choose another time
          </button>
        </div>
      )}

      {problem && problem.status !== 409 && problem.status !== 400 && (
        <p className="rounded-xl bg-white p-4 text-sm text-rose-600 ring-1 ring-rose-200">
          {problem.problem.detail ?? problem.message}
        </p>
      )}

      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {(['customerName', 'customerEmail', 'customerPhone', 'notes'] as const).map((field) => {
          const message = errorFor(field)
          return (
            <label key={field} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {LABELS[field]}
              </span>
              <input
                type={field === 'customerEmail' ? 'email' : field === 'customerPhone' ? 'tel' : 'text'}
                value={fields[field]}
                onChange={(event) =>
                  setFields((current) => ({ ...current, [field]: event.target.value }))
                }
                aria-invalid={message ? true : undefined}
                className={
                  'w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 transition placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 ' +
                  (message
                    ? 'ring-rose-300 focus-visible:ring-rose-500'
                    : 'ring-slate-200 focus-visible:ring-indigo-500')
                }
              />
              {message && <span className="mt-1 block text-xs text-rose-600">{message}</span>}
            </label>
          )
        })}
      </div>

      <button
        type="submit"
        disabled={booking.isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {booking.isPending ? 'Booking…' : 'Confirm booking'}
      </button>
    </form>
  )
}
