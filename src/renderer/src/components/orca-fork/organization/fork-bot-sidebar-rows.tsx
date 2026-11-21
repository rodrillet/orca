// orca-fork: the Bots list's touch point: header rows and draggable entries when grouped.
import React from 'react'
import {
  isBotOrganizationHeader,
  type BotOrganizationHeader
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { ForkBotOrganizationEntryFrame } from './ForkBotOrganizationEntryFrame'
import { ForkBotOrganizationHeaderRow } from './ForkBotOrganizationHeaderRow'

export { useForkBotSidebarRows } from './use-fork-bot-sidebar-rows'

/** Wraps the Bots list's row renderer so header rows draw themselves and entries can be dragged. */
export function withForkBotOrganizationRows<E extends { id: string }>(
  renderEntry: (entry: E, index: number) => React.ReactNode
): (row: E | BotOrganizationHeader, index: number) => React.ReactNode {
  return (row, index) =>
    isBotOrganizationHeader(row) ? (
      <ForkBotOrganizationHeaderRow header={row} />
    ) : (
      <ForkBotOrganizationEntryFrame entryKey={row.id}>
        {renderEntry(row, index)}
      </ForkBotOrganizationEntryFrame>
    )
}
