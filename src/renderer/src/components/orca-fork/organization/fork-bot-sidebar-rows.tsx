// orca-fork: the Bots list's touch point: header rows and draggable entries when grouped.
import React from 'react'
import {
  isBotOrganizationHeader,
  type BotOrganizationHeader
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { ForkBotOrganizationEntryFrame } from './ForkBotOrganizationEntryFrame'
import { ForkBotOrganizationHeaderRow } from './ForkBotOrganizationHeaderRow'
import { isForkChatRow, type ForkChatRow } from '../channels/use-fork-channel-rows' // orca-fork: channels
import { ForkChatRowView } from '../channels/ForkChatRowView'

export { useForkBotSidebarRows } from './use-fork-bot-sidebar-rows'

/** Bots keep the drag-to-reorder list unless departments or machines group them. */
export function isFlatList(rows: readonly unknown[]): boolean {
  return !rows.some(isBotOrganizationHeader)
}

/** Wraps the Bots list's row renderer so header rows draw themselves and entries can be dragged. */
export function withForkBotOrganizationRows<E extends { id: string }>(
  renderEntry: (entry: E, index: number) => React.ReactNode,
  /** Channel rows above the entries: an entry's index counts from the first entry. */
  leadingRows = 0
): (row: E | BotOrganizationHeader | ForkChatRow, index: number) => React.ReactNode {
  return (row, index) =>
    isForkChatRow(row) ? (
      <ForkChatRowView row={row} />
    ) : isBotOrganizationHeader(row) ? (
      <ForkBotOrganizationHeaderRow header={row} />
    ) : (
      <ForkBotOrganizationEntryFrame entryKey={row.id}>
        {renderEntry(row, index - leadingRows)}
      </ForkBotOrganizationEntryFrame>
    )
}
