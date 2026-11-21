// orca-fork: a bot's presence as the Agents views show it: offline, paused, needs you, working or idle.
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { useBotNow } from '@/components/bots/use-bot-now'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { useTranslate } from '@/i18n/use-translate'
import { foldBotStatus } from '../../../../../shared/bots/bot-row-status'
import { folderWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'
import type { Bot } from '../../../../../shared/bot-types'
import type { WorktreeStatus } from '../../../../../shared/worktree/row-display/worktree-status-rollup'

export type BotPresence = { offline: boolean; status: WorktreeStatus; label: string }

/** `needsYouItems`: open items waiting on the owner, which the bot's own status doesn't count. */
export function useBotPresence(bot: Bot, needsYouItems: number): BotPresence {
  const t = useTranslate()
  const offline = useBotHostOffline(bot.hostId)
  const homeStatus = useWorktreeActivityStatus(folderWorkspaceKey(bot.folderWorkspaceId))
  const now = useBotNow(offline ? null : bot)
  const folded = foldBotStatus(homeStatus, bot.paused)
  const status: WorktreeStatus =
    now.needsYou > 0 || needsYouItems > 0 || folded === 'permission'
      ? 'permission'
      : now.working > 0 || folded === 'working'
        ? 'working'
        : folded
  const label = offline
    ? t('orcaFork.agentsTasks.offline', 'Offline')
    : bot.paused
      ? t('orcaFork.agentsTasks.paused', 'Paused')
      : status === 'permission'
        ? t('orcaFork.agentsTasks.needsYou', 'Needs you')
        : status === 'working'
          ? t('orcaFork.agentsTasks.working', 'Working')
          : t('orcaFork.agentsTasks.idle', 'Idle')
  return { offline, status, label }
}
