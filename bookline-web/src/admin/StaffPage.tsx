import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import type { StaffAdmin } from '../api/adminTypes'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { PageHeader } from './AdminLayout'
import { Labelled, inputClass } from './ServicesPage'

type Draft = Omit<StaffAdmin, 'id'> & { id: number | null }

const PALETTE = ['#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#4f46e5']

const BLANK: Draft = {
  id: null,
  name: '',
  email: '',
  colour: '#8b5cf6',
  avatarUrl: null,
  isActive: true,
  serviceIds: [],
}

export function StaffPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data: staff, isPending } = useQuery({ queryKey: ['staff'], queryFn: adminApi.staff })
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: adminApi.services })

  const save = useMutation({
    mutationFn: (value: Draft) =>
      adminApi.saveStaff(value.id, {
        name: value.name,
        email: value.email,
        colour: value.colour,
        avatarUrl: value.avatarUrl,
        isActive: value.isActive,
        serviceIds: value.serviceIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDraft(null)
    },
  })

  const deactivate = useMutation({
    mutationFn: adminApi.deactivateStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })

  const serviceName = (id: number) => services?.find((s) => s.id === id)?.name

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={staff ? `${staff.filter((s) => s.isActive).length} active` : undefined}
        action={
          <button
            type="button"
            onClick={() => setDraft(BLANK)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            New staff member
          </button>
        }
      />

      <div className="p-6">
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
            ))}
          </div>
        ) : staff!.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <span className="text-3xl text-slate-300">☺</span>
            <p className="mt-2 text-sm font-medium text-slate-900">No staff yet</p>
            <p className="mt-1 text-sm text-slate-500">Add the people who take appointments.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {staff!.map((member) => (
              <div
                key={member.id}
                className={
                  'rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ' +
                  (member.isActive ? '' : 'opacity-60')
                }
              >
                <div className="flex items-start gap-3">
                  <Avatar name={member.name} colour={member.colour} avatarUrl={member.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {member.name}
                      {!member.isActive && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                          Inactive
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...member })}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    {member.isActive && (
                      <button
                        type="button"
                        onClick={() => deactivate.mutate(member.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.serviceIds.length === 0 ? (
                    <span className="text-xs text-slate-400">No services assigned</span>
                  ) : (
                    member.serviceIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {serviceName(id) ?? `#${id}`}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <Modal
          title={draft.id === null ? 'New staff member' : 'Edit staff member'}
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

          <Labelled label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
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

          <Labelled label="Can perform">
            <div className="space-y-1.5">
              {services?.map((service) => {
                const checked = draft.serviceIds.includes(service.id)
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        serviceIds: checked
                          ? draft.serviceIds.filter((id) => id !== service.id)
                          : [...draft.serviceIds, service.id],
                      })
                    }
                    className={
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ring-1 transition ' +
                      (checked
                        ? 'bg-indigo-50 text-indigo-900 ring-indigo-200'
                        : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')
                    }
                  >
                    <span
                      className={
                        'flex h-4 w-4 items-center justify-center rounded text-[10px] text-white ' +
                        (checked ? 'bg-indigo-600' : 'bg-slate-200')
                      }
                    >
                      {checked ? '✓' : ''}
                    </span>
                    {service.name}
                  </button>
                )
              })}
            </div>
          </Labelled>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            Active — appears on the public booking page
          </label>
        </Modal>
      )}
    </>
  )
}
