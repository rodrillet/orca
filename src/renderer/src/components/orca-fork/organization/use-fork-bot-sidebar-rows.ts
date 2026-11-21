// orca-fork: the Bots list with department/section or machine headers, per Bot options' Group by.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  groupBotSidebarEntries,
  type BotOrganizationHeader
} from '../../../../../shared/orca-fork/organization/bot-organization'
import type { BotSidebarEntry } from '../../../../../shared/bots/bot-sidebar-entries'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { useBotOrganization } from './bot-organization-store'
import { useForkWorkspaceDepartments } from '../workspaces/fork-workspace-departments'
import type { ForkChatRow } from '../channels/use-fork-channel-rows'

type Hosted = { hostId: ExecutionHostId }
type HostedEntry = BotSidebarEntry<Hosted, Hosted, unknown>

function hostOf(entry: HostedEntry): ExecutionHostId {
  return entry.kind === 'bot' ? entry.bot.hostId : entry.group.hostId
}

const LABEL_SEPARATOR = '\u0000'

/** `leading` (the channel rows) goes above the bots, whatever they are grouped by. */
export function useForkBotSidebarRows<E extends HostedEntry>(
  entries: readonly E[],
  leading: readonly ForkChatRow[] = NO_ROWS
): readonly (E | BotOrganizationHeader | ForkChatRow)[] {
  const rows = useGroupedBotSidebarRows(entries)
  return useMemo(() => (leading.length > 0 ? [...leading, ...rows] : rows), [leading, rows])
}

const NO_ROWS: readonly ForkChatRow[] = []

function useGroupedBotSidebarRows<E extends HostedEntry>(
  entries: readonly E[]
): readonly (E | BotOrganizationHeader)[] {
  const t = useTranslate()
  const doc = useForkWorkspaceDepartments(useBotOrganization())
  const groupBy = FORK_FEATURES.botOrganization ? doc.view.groupBy : 'none'
  const hostIds = useMemo(() => [...new Set(entries.map(hostOf))], [entries])
  // Joined into one string so the selector stays stable between renders.
  const joinedLabels = useAppStore((state) =>
    groupBy === 'machine'
      ? hostIds
          .map((hostId) => selectExecutionHostDisplayLabel(state, hostId))
          .join(LABEL_SEPARATOR)
      : ''
  )
  return useMemo(() => {
    if (groupBy === 'none') {
      return entries
    }
    const labels = new Map<string, string>(
      joinedLabels.split(LABEL_SEPARATOR).map((label, index) => [String(hostIds[index]), label])
    )
    return groupBotSidebarEntries(entries, doc, {
      hostOf,
      machine: (hostId: string) => labels.get(hostId) || hostId,
      unassigned: t('orcaFork.botOrganization.unassigned', 'No department')
    })
  }, [groupBy, entries, doc, joinedLabels, hostIds, t])
}
