// orca-fork: what the Department page reads: the active workspace's departments (archived included),
// its bots and bot groups, and who sits where.
import { useMemo } from 'react'
import { useBots } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import type {
  BotOrganization,
  BotOrganizationDepartment
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { departmentProfileOf } from '../../../../../shared/orca-fork/departments/department-edits'
import type { DepartmentProfile } from '../../../../../shared/orca-fork/departments/department-profile'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { useBotOrganization } from '../organization/bot-organization-store'
import { useForkWorkspaceDepartments } from '../workspaces/fork-workspace-departments'
import { useForkWorkspaceOwners } from '../workspaces/use-fork-workspace-scope'

export type DepartmentMember =
  | { key: string; kind: 'bot'; bot: Bot; sectionId: string | null }
  | { key: string; kind: 'group'; group: BotGroup; sectionId: string | null }

export type DepartmentWorld = {
  doc: BotOrganization
  /** The workspace's departments, archived last-kept in their own order. */
  departments: (BotOrganizationDepartment & { profile: DepartmentProfile })[]
  bots: readonly Bot[]
  groups: readonly BotGroup[]
  membersOf: (departmentId: string) => DepartmentMember[]
  /** Bots of the workspace in no department. */
  unplacedBots: Bot[]
}

export function useDepartmentWorld(): DepartmentWorld {
  const doc = useForkWorkspaceDepartments(useBotOrganization(), true)
  const bots = useForkWorkspaceOwners(useBots())
  const groups = useForkWorkspaceOwners(useBotGroups())
  return useMemo(() => {
    const members = new Map<string, DepartmentMember[]>()
    const push = (departmentId: string, member: DepartmentMember): void => {
      members.set(departmentId, [...(members.get(departmentId) ?? []), member])
    }
    const unplacedBots: Bot[] = []
    for (const bot of bots) {
      const key = botSidebarEntryKey(bot)
      const placement = doc.placements[key]
      if (placement) {
        push(placement.departmentId, { key, kind: 'bot', bot, sectionId: placement.sectionId })
      } else {
        unplacedBots.push(bot)
      }
    }
    for (const group of groups) {
      const key = botSidebarEntryKey(group)
      const placement = doc.placements[key]
      if (placement) {
        push(placement.departmentId, { key, kind: 'group', group, sectionId: placement.sectionId })
      }
    }
    return {
      doc,
      departments: doc.departments.map((dept) => ({
        ...dept,
        profile: departmentProfileOf(doc, dept.id)
      })),
      bots,
      groups,
      membersOf: (departmentId) => members.get(departmentId) ?? [],
      unplacedBots
    }
  }, [doc, bots, groups])
}

export function memberName(member: DepartmentMember): string {
  return member.kind === 'bot' ? member.bot.name : member.group.name
}
