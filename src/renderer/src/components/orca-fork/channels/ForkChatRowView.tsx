// orca-fork: draws a channel-list row in the Bots list: the Channels or a category header, or a
// channel (its bot group's own row, in a frame that drags it between categories).
import React from 'react'
import { useAppStore } from '@/store'
import { useBots } from '@/lib/bot-catalog'
import { selectActiveBotGroupRoomId } from '@/lib/bot-group-catalog'
import { botGroupMemberBots } from '../../../../../shared/bots/bot-sidebar-entries'
import { findBotGroupRoom } from '../../../../../shared/bots/bot-group'
import { BotGroupRow } from '../../bots/BotGroupRow'
import { useBotGroupDelete } from '../../bots/use-bot-group-delete'
import { ForkChatHeaderRow } from './ForkChatHeaderRow'
import { ForkChannelEntryFrame } from './ForkChannelEntryFrame'
import { forkSidebarDialogs } from './fork-sidebar-create'
import type { ForkChannelRow, ForkChatRow } from './use-fork-channel-rows'

export function ForkChatRowView({ row }: { row: ForkChatRow }): React.JSX.Element {
  if (row.kind === 'fork-channel') {
    return (
      <ForkChannelEntryFrame entryKey={row.id} categoryId={row.categoryId} nextKey={row.nextKey}>
        <ForkChannelRowBody row={row} />
      </ForkChannelEntryFrame>
    )
  }
  if (row.divider) {
    return (
      <div className="flex h-7 items-center gap-1 pl-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="size-3" />
        {row.title}
        <span className="font-medium tabular-nums opacity-70">{row.count}</span>
      </div>
    )
  }
  return <ForkChatHeaderRow header={row} nextCategoryId={row.nextCategoryId} />
}

function ForkChannelRowBody({ row }: { row: ForkChannelRow }): React.JSX.Element {
  const bots = useBots()
  const deleteGroup = useBotGroupDelete()
  const isActive = useAppStore((state) => {
    const roomId = selectActiveBotGroupRoomId(state)
    return roomId !== null && findBotGroupRoom([row.group], roomId) !== null
  })
  return (
    <BotGroupRow
      group={row.group}
      home={row.home}
      members={botGroupMemberBots(row.group, bots)}
      isActive={isActive}
      onOpen={() => forkSidebarDialogs()?.opened()}
      onManageMembers={() => forkSidebarDialogs()?.editGroup(row.group)}
      onDelete={() => void deleteGroup(row.group)}
    />
  )
}
