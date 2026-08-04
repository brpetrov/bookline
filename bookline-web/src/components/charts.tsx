/**
 * Hand-rolled SVG charts. Two simple charts don't justify a charting dependency,
 * and this way they inherit the design tokens exactly.
 */

export function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number; sublabel?: string }[]
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-medium tabular-nums text-slate-500">{bar.value}</span>
          <div
            className="w-full rounded-t-md bg-indigo-500 transition-all"
            style={{ height: `${(bar.value / max) * (height - 46)}px`, minHeight: 2 }}
            title={`${bar.label}: ${bar.value}`}
          />
          <span className="text-[11px] text-slate-400">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Donut({
  data,
  size = 168,
  thickness = 22,
}: {
  data: { label: string; value: number; colour: string }[]
  size?: number
  thickness?: number
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={thickness}
            />
          )}
          {data.map((slice) => {
            const length = (slice.value / total) * circumference
            const dash = `${length} ${circumference - length}`
            const element = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.colour}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return element
          })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-900 text-xl font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {total}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.colour }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">{slice.label}</span>
            <span className="font-medium tabular-nums text-slate-900">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
