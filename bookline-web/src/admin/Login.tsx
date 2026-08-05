import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('demo@bookline.app')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin/calendar'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.problem.detail ?? caught.message)
          : 'Could not reach the server.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-indigo-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Two soft blooms instead of a flat block of colour. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60rem 40rem at 15% 0%, rgba(139,92,246,0.55), transparent 60%),' +
              'radial-gradient(40rem 40rem at 95% 90%, rgba(14,165,233,0.45), transparent 60%)',
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white ring-1 ring-white/25">
            B
          </span>
          <span className="font-semibold tracking-tight text-white">Bookline</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Every booking, every stylist, one calendar.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-indigo-100">
            {[
              'Availability calculated from opening hours, individual shifts, time off and buffers',
              'Drag-and-drop week calendar with a detail drawer for every appointment',
              'New bookings appear on any open calendar instantly, pushed over SignalR',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white ring-1 ring-white/25"
                >
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200">
          Demo tenant · Kestrel &amp; Co, Leeds — four stylists, five services, a seeded fortnight
          of appointments.
        </p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-12 lg:min-h-0">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              B
            </span>
            <span className="font-semibold tracking-tight text-slate-900">Bookline</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to the staff dashboard</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Demo login · <span className="font-medium">demo@bookline.app</span> /{' '}
            <span className="font-medium">demo</span>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Bookline is a portfolio project ·{' '}
          <a
            href="https://github.com/brpetrov/bookline"
            className="font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            source on GitHub
          </a>
        </p>
      </div>
      </div>
    </div>
  )
}
