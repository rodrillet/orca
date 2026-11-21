// orca-fork: a bot's presence as the Agents views show it, by the presence dot's rules (green working,
// yellow idle, red stopped or needs you, grey off) plus what only these views read: its open items
// waiting on the owner and its workers.
import { useBotNow } from '@/components/bots/use-bot-now'
import { useBotActivity } from '@/components/bots/use-bot-activity'
import { useBotHostOffline } from '@/lib/bot-host-views'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotPresence as Presence } from '../../../../../shared/orca-fork/presence/bot-presence'
import { useForkBotPresence, usePresenceLabel } from '../presence/ForkBotPresenceDot'

export type BotPresence = { offline: boolean; presence: Presence; label: string }

/** Only rows whose agent is on a turn: an open worker resting after its report is not work. */
function hasWorkingRow(rows: readonly { dot: string | null }[]): boolean {
  return rows.some((row) => row.dot === 'working' || row.dot === 'monitoring')
}

/** `needsYouItems`: open items waiting on the owner, which the bot's own status doesn't count. */
export function useBotPresence(bot: Bot, needsYouItems: number): BotPresence {
  const offline = useBotHostOffline(bot.hostId)
  const read = offline ? null : bot
  const now = useBotNow(read)
  const activity = useBotActivity(read)
  const base = useForkBotPresence(bot, now.needsYou > 0 || needsYouItems > 0) ?? 'off'
  const presence: Presence =
    base === 'idle' || (base === 'off' && !offline && !bot.paused)
      ? hasWorkingRow([...activity.workers, ...activity.inProgress])
        ? 'working'
        : base
      : base
  return { offline, presence, label: usePresenceLabel(presence) }
}
