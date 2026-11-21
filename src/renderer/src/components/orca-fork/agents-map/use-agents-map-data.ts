// orca-fork: the Agents map's data: the active workspace's bots and rooms, and each room's latest
// posts (read from the room's machine), re-read when that machine's bots change and every 20 s.
import { useEffect, useMemo, useState } from 'react'
import { useBots } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import { callBotRpc } from '@/lib/bot-hosts'
import { onBotsChanged } from '@/lib/bots-changed-window-event'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup, BotGroupMessage } from '../../../../../shared/bots/bot-group'
import {
  buildAgentsMap,
  type MapEdge,
  type MapMessage,
  type MapRoom
} from '../../../../../shared/orca-fork/agents-map/agents-map-model'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { useForkWorkspaceOwners } from '../workspaces/use-fork-workspace-scope'
import { useChatStructure } from '../channels/chat-structure-store'

const REFRESH_MS = 20_000

export type AgentsMapData = {
  bots: readonly Bot[]
  rooms: readonly (MapRoom & { group: BotGroup })[]
  edges: readonly MapEdge[]
}

function toMapMessage(message: BotGroupMessage): MapMessage {
  return {
    author:
      message.author.kind === 'owner' ? { kind: 'owner' } : { kind: 'bot', id: message.author.id },
    text: message.text,
    createdAt: message.createdAt,
    requester: message.requester,
    answeredBy: message.answeredBy
  }
}

export function useAgentsMapData(open: boolean): AgentsMapData {
  const bots = useForkWorkspaceOwners(useBots())
  const groups = useForkWorkspaceOwners(useBotGroups())
  const structure = useChatStructure()
  const [messages, setMessages] = useState<ReadonlyMap<string, readonly MapMessage[]>>(new Map())

  const rooms = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        kind: structure.channels[botSidebarEntryKey(group)]
          ? ('channel' as const)
          : ('group' as const),
        botIds: group.members.map((member) => member.botId),
        group
      })),
    [groups, structure.channels]
  )

  useEffect(() => {
    if (!open || groups.length === 0) {
      return
    }
    let closed = false
    const read = (): void => {
      void Promise.all(
        groups.map(async (group) => {
          try {
            const page = await callBotRpc<{ messages: BotGroupMessage[] }>(
              group,
              'bots.groups.read',
              {
                groupId: group.id
              }
            )
            return [group.id, page.messages.map(toMapMessage)] as const
          } catch {
            // An offline machine's room keeps no posts on the map.
            const none: MapMessage[] = []
            return [group.id, none] as const
          }
        })
      ).then((pairs) => {
        if (!closed) {
          setMessages(new Map(pairs))
        }
      })
    }
    read()
    const stopTimer = installWindowVisibilityInterval({
      run: read,
      intervalMs: REFRESH_MS,
      slowWhileUnfocused: true
    })
    const stop = onBotsChanged(() => read())
    return () => {
      closed = true
      stopTimer()
      stop()
    }
  }, [open, groups])

  const edges = useMemo(() => buildAgentsMap(bots, rooms, messages), [bots, rooms, messages])
  return { bots, rooms, edges }
}
