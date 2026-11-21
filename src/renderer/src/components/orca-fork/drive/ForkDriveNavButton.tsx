// orca-fork: the sidebar's Drive entry, under Tasks.
import { HardDrive } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { openForkDrivePage, useForkDriveActive } from './drive-page-state'

export function ForkDriveNavButton(): React.JSX.Element | null {
  const t = useTranslate()
  const active = useForkDriveActive()
  if (!FORK_FEATURES.drive) {
    return null
  }
  return (
    <button
      type="button"
      onClick={openForkDrivePage}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        active
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <HardDrive
        className={cn('size-4 shrink-0', !active && 'text-worktree-sidebar-foreground/30')}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="flex-1">{t('orcaFork.drive.title', 'Drive')}</span>
    </button>
  )
}
