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

const PLACEHOLDERS: Record<keyof Fields, string> = {
  customerName: 'Jamie Fletcher',
  customerEmail: 'jamie.fletcher@example.com',
  customerPhone: '07700 900123',
  notes: 'Parking, allergies, a fringe you regret…',
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

  const set = (field: keyof Fields) => (value: string) =>
    setFields((current) => ({ ...current, [field]: value }))

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
      <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <span
          className="h-11 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: service.colour }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{service.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {salonDateLong(slot.startsAtUtc)} at {salonTime(slot.startsAtUtc)} ·{' '}
            {service.durationMinutes} min
          </p>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums tracking-tight text-slate-900">
          {money(service.pricePence)}
        </span>
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

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <Field field="customerName" value={fields.customerName} onChange={set('customerName')} error={errorFor('customerName')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            field="customerEmail"
            type="email"
            value={fields.customerEmail}
            onChange={set('customerEmail')}
            error={errorFor('customerEmail')}
          />
          <Field
            field="customerPhone"
            type="tel"
            value={fields.customerPhone}
            onChange={set('customerPhone')}
            error={errorFor('customerPhone')}
          />
        </div>

        <Field field="notes" multiline value={fields.notes} onChange={set('notes')} error={errorFor('notes')} />
      </div>

      <button
        type="submit"
        disabled={booking.isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {booking.isPending ? 'Booking…' : `Confirm booking · ${money(service.pricePence)}`}
      </button>

      <p className="text-center text-xs text-slate-400">
        We'll hold this slot as soon as you confirm. Nothing is charged online.
      </p>
    </form>
  )
}

function Field({
  field,
  value,
  onChange,
  error,
  type = 'text',
  multiline = false,
}: {
  field: keyof Fields
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  multiline?: boolean
}) {
  const shared =
    'w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 transition placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 ' +
    (error ? 'ring-rose-300 focus-visible:ring-rose-500' : 'ring-slate-200 focus-visible:ring-indigo-500')

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{LABELS[field]}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDERS[field]}
          aria-invalid={error ? true : undefined}
          className={shared + ' resize-none'}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDERS[field]}
          aria-invalid={error ? true : undefined}
          className={shared}
        />
      )}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}
