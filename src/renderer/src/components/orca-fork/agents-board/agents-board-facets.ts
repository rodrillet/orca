// orca-fork: what the Agents board filters by besides a card's own fields: machine names and organization tags.
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useBotOrganization } from '@/components/orca-fork/organization/bot-organization-store'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import {
  getLocalExecutionHostLabel,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import type { AgentsBoardFilterOption } from './AgentsBoardToolbar'

export function useHostLabels(hostIds: readonly ExecutionHostId[]): Record<string, string> {
  const labels = useAppStore(
    useShallow((state) =>
      hostIds.map((hostId) =>
        hostId === LOCAL_EXECUTION_HOST_ID
          ? getLocalExecutionHostLabel()
          : selectExecutionHostDisplayLabel(state, hostId)
      )
    )
  )
  return useMemo(
    () => Object.fromEntries(hostIds.map((hostId, index) => [hostId, labels[index] ?? hostId])),
    [hostIds, labels]
  )
}

/** Organization tags per bot: its department, and its section under it. */
export function useBotTags(): {
  tagsOf: (botKey: string) => string[]
  tagLabel: Map<string, string>
} {
  const organization = useBotOrganization()
  return useMemo(() => {
    const tagLabel = new Map<string, string>()
    for (const department of organization.departments) {
      tagLabel.set(department.id, department.name)
      for (const section of department.sections) {
        tagLabel.set(section.id, `${department.name} › ${section.name}`)
      }
    }
    const tagsOf = (botKey: string): string[] => {
      const placement = organization.placements[botKey]
      return placement
        ? [placement.departmentId, ...(placement.sectionId ? [placement.sectionId] : [])]
        : []
    }
    return { tagsOf, tagLabel }
  }, [organization])
}

export function countOptions(
  values: readonly string[],
  label: (id: string) => string
): AgentsBoardFilterOption[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: label(id), count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
