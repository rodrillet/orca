// orca-fork: the presence dot on a bot's picture: green working, yellow idle, red stopped or blocked,
// grey off (nothing loaded).
import React from 'react'
import { useBotAvatarBadgeSleeping } from '@/components/bots/bot-avatar-status-badge'
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { useTranslate } from '@/i18n/use-translate'
import { useBotHostOffline } from '@/lib/bot-host-views'
import type { BotOnHost } from '@/lib/bot-hosts'
import type { Bot } from '../../../../../shared/bot-types'
import { cn } from '@/lib/class-names'
import { useBotChatLiveState } from './use-bot-chat-live-state'
import type { WorktreeStatus } from '../../../../../shared/worktree/row-display/worktree-status-rollup'
import {
  botPresence,
  type BotPresence
} from '../../../../../shared/orca-fork/presence/bot-presence'
import { folderWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'

const DOT_CLASS: Record<BotPresence, string> = {
  working: 'bg-status-success',
  idle: 'bg-status-warning',
  blocked: 'bg-destructive',
  off: 'bg-muted-foreground/50'
}

function withChatState(status: WorktreeStatus, chatState: string | null): WorktreeStatus {
  if (chatState === 'blocked' || chatState === 'waiting') {
    return 'permission'
  }
  if (chatState === 'working' && status !== 'permission' && status !== 'failed') {
    return 'working'
  }
  return status
}

/** A picture's bot: a listed `Bot` carries its home, pause and Chat; one carried by a message or card doesn't. */
export type PresenceBot = BotOnHost &
  Partial<Pick<Bot, 'folderWorkspaceId' | 'paused' | 'chatSessionId'>>

export function useForkBotPresence(bot: PresenceBot, blocked = false): BotPresence | null {
  const workspaceId = bot.folderWorkspaceId ? folderWorkspaceKey(bot.folderWorkspaceId) : ''
  const status = useWorktreeActivityStatus(workspaceId)
  const sleeping = useBotAvatarBadgeSleeping(workspaceId, status)
  const offline = useBotHostOffline(bot.hostId)
  // Its Chat's own agent state: a turn on the bot's host shows even before its home's panes report.
  const chatState = useBotChatLiveState(bot.chatSessionId)
  if (!bot.folderWorkspaceId) {
    return null
  }
  return botPresence({
    status: withChatState(status, chatState),
    paused: bot.paused === true,
    offline,
    sleeping: sleeping && chatState !== 'working',
    blocked
  })
}

export function usePresenceLabel(presence: BotPresence): string {
  const t = useTranslate()
  switch (presence) {
    case 'working':
      return t('orcaFork.presence.working', 'Working')
    case 'idle':
      return t('orcaFork.presence.idle', 'Idle')
    case 'blocked':
      return t('orcaFork.presence.blocked', 'Stopped or needs you')
    case 'off':
      return t('orcaFork.presence.off', 'Off')
  }
}

export function PresenceDot({
  presence,
  className
}: {
  presence: BotPresence
  className?: string
}): React.JSX.Element {
  const label = usePresenceLabel(presence)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-presence={presence}
      className={cn(
        // Sized from the picture: a 36px sidebar picture gets a 10px dot, a 16px chip a 5px one.
        'absolute right-[-6%] bottom-[-6%] size-[30%] min-h-[5px] min-w-[5px] max-h-2.5 max-w-2.5 rounded-full ring-2 ring-background',
        DOT_CLASS[presence],
        className
      )}
    />
  )
}

/** The dot for a listed bot; nothing for one this window's bot lists don't have. */
export function ForkBotPresenceDot({
  bot,
  blocked
}: {
  bot: PresenceBot
  blocked: boolean
}): React.JSX.Element | null {
  const presence = useForkBotPresence(bot, blocked)
  return presence ? <PresenceDot presence={presence} /> : null
}
