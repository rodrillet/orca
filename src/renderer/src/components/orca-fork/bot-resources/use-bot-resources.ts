// orca-fork: the memory and CPU one bot's agent processes use now, on the machine that runs it.
import { useMemo } from 'react'
import type { Bot } from '../../../../../shared/bot-types'
import {
  botResourceUsage,
  type BotResourceUsage
} from '../../../../../shared/orca-fork/resource-monitor/bot-resources'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { useBotWorkList } from '../agents-tasks/use-bot-work-list'
import { useHostResources } from './use-host-resources'

/** `basic`: a stock orca-server, which lists no agent processes. */
export type BotResources =
  | { state: 'loading' | 'unreachable' | 'basic' }
  | ({ state: 'ok' } & BotResourceUsage)

export function useBotResources(bot: Bot): BotResources {
  const offline = useBotHostOffline(bot.hostId)
  const result = useHostResources(offline ? null : bot.hostId)
  // The host names the workspaces under the bot in its own ids, the ones its sample uses.
  const work = useBotWorkList(bot)
  const workspaceIds = useMemo(
    () => new Set((work?.workspaces ?? []).map((workspace) => workspace.id)),
    [work]
  )
  return useMemo((): BotResources => {
    if (offline || result?.status === 'unreachable') {
      return { state: 'unreachable' }
    }
    if (!result) {
      return { state: 'loading' }
    }
    if (result.status === 'basic') {
      return { state: 'basic' }
    }
    return { state: 'ok', ...botResourceUsage(result.data.agents, bot.id, workspaceIds) }
  }, [offline, result, bot.id, workspaceIds])
}
