import type { BookingConfirmation } from '../api/types'
import { money, salonDateLong, salonTime } from '../lib/format'

export function Confirmed({
  confirmation,
  onBookAnother,
}: {
  confirmation: BookingConfirmation
  onBookAnother: () => void
}) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
        ✓
      </span>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">You’re booked in</h2>
      <p className="mt-1 text-sm text-slate-500">
        A confirmation is on its way to {confirmation.customerEmail}
      </p>

      <dl className="mt-6 space-y-2 text-left text-sm">
        <Row label="Service" value={confirmation.serviceName} />
        <Row label="Stylist" value={confirmation.staffName} />
        <Row label="Date" value={salonDateLong(confirmation.startsAtUtc)} />
        <Row
          label="Time"
          value={`${salonTime(confirmation.startsAtUtc)} – ${salonTime(confirmation.endsAtUtc)}`}
        />
        <Row label="Price" value={money(confirmation.pricePence)} />
        <Row label="Reference" value={`#${confirmation.appointmentId}`} />
      </dl>

      <button
        type="button"
        onClick={onBookAnother}
        className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Book another appointment
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-900">{value}</dd>
    </div>
  )
}
