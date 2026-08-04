import { initials } from '../lib/format'

export function Avatar({
  name,
  colour,
  avatarUrl,
}: {
  name: string
  colour: string
  avatarUrl?: string | null
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: colour }}
    >
      {initials(name)}
    </span>
  )
}
