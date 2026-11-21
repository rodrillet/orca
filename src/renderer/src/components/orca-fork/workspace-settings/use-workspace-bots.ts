// orca-fork: the active workspace's bots and bot groups, as its sidebar lists them.
import { useBots } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { useForkWorkspaceOwners } from '../workspaces/use-fork-workspace-scope'

export function useWorkspaceBots(): { bots: readonly Bot[]; groups: readonly BotGroup[] } {
  return {
    bots: useForkWorkspaceOwners(useBots()),
    groups: useForkWorkspaceOwners(useBotGroups())
  }
}
