// orca-fork: the Bots list's channel rows (Channels header, loose channels, categories) and the rest.
import { useMemo } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  isChatStructureHeader,
  splitChannelEntries,
  type ChatStructureHeader
} from '../../../../../shared/orca-fork/channels/chat-structure'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import type { FolderWorkspace } from '../../../../../shared/folder-workspaces/folder-workspace-types'
import { useActiveForkWorkspaceId } from '../workspaces/fork-workspaces-store'
import { useChatStructure } from './chat-structure-store'
import { useBotSidebarArrangement } from '../../bots/use-bot-sidebar-arrangement'

export type ForkChannelRow = {
  kind: 'fork-channel'
  id: string
  group: BotGroup
  home: FolderWorkspace
  categoryId: string | null
  /** The channel after it in its category, so a drop on its lower half lands before that one. */
  nextKey: string | null
}

export type ForkChatHeaderListRow = ChatStructureHeader & {
  nextCategoryId: string | null
  /** The plain "Bots" label between the channels and the bots. */
  divider?: true
}
export type ForkChatRow = ForkChatHeaderListRow | ForkChannelRow

export function isForkChatRow(row: unknown): row is ForkChatRow {
  return (
    isChatStructureHeader(row) ||
    (typeof row === 'object' && row !== null && 'kind' in row && row.kind === 'fork-channel')
  )
}

/** The saved entries in the Bots list's order, channels taken out into their own rows. */
type Entry = ReturnType<typeof useBotSidebarArrangement>[number]
type GroupEntry = Extract<Entry, { kind: 'group' }>

export function useForkChannelRows(savedEntries: readonly Entry[]): {
  rows: readonly ForkChatRow[]
  rest: readonly Entry[]
} {
  const entries = useBotSidebarArrangement(savedEntries)
  const t = useTranslate()
  const doc = useChatStructure()
  const workspaceId = useActiveForkWorkspaceId()
  const title = t('orcaFork.chatStructure.channels', 'Channels')
  const botsTitle = t('orcaFork.chatStructure.bots', 'Bots')
  return useMemo(() => {
    if (!FORK_FEATURES.chatStructure) {
      return { rows: [], rest: entries }
    }
    const parts = splitChannelEntries(
      entries,
      doc,
      FORK_FEATURES.workspaces ? workspaceId : null,
      title
    )
    const rows: ForkChatRow[] = []
    let categoryId: string | null = null
    let previousChannel: ForkChannelRow | null = null
    let previousHeader: ForkChatHeaderListRow | null = null
    for (const row of parts.rows) {
      if (isChatStructureHeader(row)) {
        categoryId = row.categoryId
        previousChannel = null
        const header: ForkChatHeaderListRow = { ...row, nextCategoryId: null }
        if (row.categoryId) {
          if (previousHeader) {
            previousHeader.nextCategoryId = row.categoryId
          }
          previousHeader = header
        }
        rows.push(header)
        continue
      }
      if (row.kind !== 'group') {
        continue
      }
      const entry: GroupEntry = row
      const channel: ForkChannelRow = {
        kind: 'fork-channel',
        id: entry.id,
        group: entry.group,
        home: entry.home,
        categoryId,
        nextKey: null
      }
      if (previousChannel) {
        previousChannel.nextKey = channel.id
      }
      previousChannel = channel
      rows.push(channel)
    }
    if (rows.length > 0 && parts.rest.length > 0) {
      rows.push({
        kind: 'fork-chat-header',
        id: 'fork-chat-bots',
        level: 0,
        title: botsTitle,
        count: parts.rest.length,
        collapsed: false,
        categoryId: null,
        nextCategoryId: null,
        divider: true
      })
    }
    return { rows, rest: parts.rest }
  }, [entries, doc, workspaceId, title, botsTitle])
}
