export function Modal({
  title,
  children,
  onClose,
  onSubmit,
  busy,
  error,
  submitLabel = 'Save',
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  onSubmit: () => void
  busy?: boolean
  error?: string | null
  submitLabel?: string
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/25" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          className="w-full max-w-md rounded-xl bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold tracking-tight text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </header>

          <div className="space-y-4 p-5">
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}
            {children}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </>
  )
}
