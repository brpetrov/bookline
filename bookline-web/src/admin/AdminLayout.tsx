import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { initials } from '../lib/format'
import { useScheduleHub } from './useScheduleHub'

const NAV = [
  { to: '/admin/calendar', label: 'Calendar', icon: '▦' },
  { to: '/admin/dashboard', label: 'Dashboard', icon: '◔' },
  { to: '/admin/services', label: 'Services', icon: '✂' },
  { to: '/admin/staff', label: 'Staff', icon: '☺' },
  { to: '/admin/hours', label: 'Opening hours', icon: '◷' },
]

export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function AdminLayout() {
  const { session, signOut } = useAuth()
  const live = useScheduleHub()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            B
          </span>
          <span className="font-semibold tracking-tight text-slate-900">Bookline</span>
          <span
            title={live ? 'Live updates connected' : 'Live updates offline'}
            className={
              'ml-auto h-2 w-2 rounded-full ' + (live ? 'bg-emerald-500' : 'bg-slate-300')
            }
          />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                (isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
              }
            >
              <span className="w-4 text-center text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials(session?.displayName ?? 'Demo')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">
                {session?.displayName}
              </span>
              <span className="block truncate text-xs text-slate-500">{session?.email}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-60 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
