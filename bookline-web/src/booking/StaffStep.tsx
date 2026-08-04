import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Service } from '../api/types'
import { Avatar } from '../components/Avatar'

export function StaffStep({
  service,
  onPick,
}: {
  service: Service
  onPick: (staffId: number | null) => void
}) {
  const { data: staff, isPending, error } = useQuery({
    queryKey: ['staff', service.id],
    queryFn: () => api.staff(service.id),
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
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
        Couldn’t load stylists — {error.message}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onPick(null)}
        className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          ★
        </span>
        <span className="flex-1">
          <span className="block font-medium text-slate-900">Anyone</span>
          <span className="block text-sm text-slate-500">Earliest available stylist</span>
        </span>
      </button>

      {staff?.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onPick(member.id)}
          className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Avatar name={member.name} colour={member.colour} avatarUrl={member.avatarUrl} />
          <span className="flex-1">
            <span className="block font-medium text-slate-900">{member.name}</span>
            <span className="block text-sm text-slate-500">{service.name}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
