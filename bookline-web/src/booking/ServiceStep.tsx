import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Service } from '../api/types'
import { money } from '../lib/format'

export function ServiceStep({ onPick }: { onPick: (service: Service) => void }) {
  const { data: services, isPending, error } = useQuery({
    queryKey: ['services'],
    queryFn: api.services,
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-xl bg-white ring-1 ring-slate-200"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-rose-600 ring-1 ring-rose-200">
        Couldn’t load services — {error.message}
      </p>
    )
  }

  if (!services?.length) {
    return (
      <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-900">No services available</p>
        <p className="mt-1 text-sm text-slate-500">Please check back shortly.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onPick(service)}
          className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span
            className="h-10 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: service.colour }}
          />
          <span className="flex-1">
            <span className="block font-medium text-slate-900">{service.name}</span>
            <span className="block text-sm text-slate-500">{service.durationMinutes} min</span>
          </span>
          <span className="font-medium tabular-nums text-slate-900">
            {money(service.pricePence)}
          </span>
        </button>
      ))}
    </div>
  )
}
