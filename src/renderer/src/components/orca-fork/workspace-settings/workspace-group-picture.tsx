// orca-fork: a bot group's initials on a round tile, where its faces don't fit and it has no photo.
import { cn } from '@/lib/class-names'

export function ForkGroupInitials({ name, className }: { name: string; className: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold text-foreground uppercase',
        className
      )}
    >
      {letters}
    </span>
  )
}
