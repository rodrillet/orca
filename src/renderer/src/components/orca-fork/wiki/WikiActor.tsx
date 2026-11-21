// orca-fork: who wrote or read a wiki page: the bot's picture and name, an agent, or the owner.
import React from 'react'
import { Bot as BotIcon, UserRound } from 'lucide-react'
import { BotAvatar, BotAvatarTile } from '@/components/bots/BotAvatar'
import { useHostBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import { formatUiCoarseRelativeTime } from '@/i18n/relative-time-format'
import { cn } from '@/lib/class-names'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { WikiActor } from '../../../../../shared/orca-fork/wiki/wiki-types'

export function wikiWhen(at: number): string {
  return formatUiCoarseRelativeTime(at - Date.now())
}

export function useWikiActorName(): (actor: WikiActor) => string {
  const t = useTranslate()
  return (actor) => (actor.kind === 'owner' ? t('orcaFork.wiki.you', 'You') : actor.name)
}

export function WikiActorAvatar({
  actor,
  hostId,
  className
}: {
  actor: WikiActor
  hostId: ExecutionHostId
  className?: string
}): React.JSX.Element {
  const bots = useHostBots(hostId)
  const size = cn('size-5 rounded-full text-3xs', className)
  if (actor.kind === 'bot') {
    const bot = bots.find((entry) => entry.id === actor.botId)
    return bot ? (
      <BotAvatar bot={bot} className={size} />
    ) : (
      <BotAvatarTile src={null} fallback={actor.name.slice(0, 1).toUpperCase()} className={size} />
    )
  }
  const Icon = actor.kind === 'owner' ? UserRound : BotIcon
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground',
        size
      )}
    >
      <Icon className="size-3" />
    </span>
  )
}
