// orca-fork: the owner's photo (else their initial) with their status dot: green available, red busy,
// yellow away.
import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { ownerProfileStore, type OwnerPresence } from './owner-profile-store'

const DOT_CLASS: Record<OwnerPresence, string> = {
  available: 'bg-status-success',
  busy: 'bg-destructive',
  away: 'bg-status-warning'
}

export function useOwnerDisplayName(): string {
  const t = useTranslate()
  const { name } = ownerProfileStore.use()
  return name.trim() || t('orcaFork.ownerProfile.you', 'You')
}

export function useOwnerPresenceLabel(presence: OwnerPresence): string {
  const t = useTranslate()
  switch (presence) {
    case 'available':
      return t('orcaFork.ownerProfile.available', 'Available')
    case 'busy':
      return t('orcaFork.ownerProfile.busy', 'Busy')
    case 'away':
      return t('orcaFork.ownerProfile.away', 'Away')
  }
}

export function OwnerAvatar({
  className,
  photo
}: {
  className: string
  /** A picture not saved yet (the profile dialog's draft). */
  photo?: string | null
}): React.JSX.Element {
  const profile = ownerProfileStore.use()
  const name = useOwnerDisplayName()
  const label = useOwnerPresenceLabel(profile.presence)
  const shown = photo === undefined ? profile.photo : photo
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {shown ? (
        <img src={shown} alt="" className="size-full rounded-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex size-full items-center justify-center rounded-full bg-primary/15 text-[0.8em] font-semibold text-foreground"
        >
          {(name.trim()[0] ?? '?').toUpperCase()}
        </span>
      )}
      <span
        role="img"
        aria-label={label}
        title={label}
        className={cn(
          'absolute right-[-4%] bottom-[-4%] size-[30%] min-h-[6px] min-w-[6px] max-h-3 max-w-3 rounded-full ring-2 ring-background',
          DOT_CLASS[profile.presence]
        )}
      />
    </span>
  )
}
