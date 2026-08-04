const STEPS = ['Service', 'Stylist', 'Time', 'Details'] as const

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {STEPS.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'

        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] ' +
                (state === 'done'
                  ? 'bg-indigo-600 text-white'
                  : state === 'current'
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                    : 'bg-slate-100 text-slate-400')
              }
            >
              {state === 'done' ? '✓' : index + 1}
            </span>
            {/* On narrow screens only the current step keeps its label, so the
                row never overflows. */}
            <span
              className={
                (state === 'current' ? 'inline' : 'hidden sm:inline') +
                (state === 'todo' ? ' text-slate-400' : ' text-slate-700')
              }
            >
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="h-px w-3 bg-slate-200 sm:w-4" />}
          </li>
        )
      })}
    </ol>
  )
}
