// orca-fork: each workspace's teams: a department (with its sections) shows only in its workspace.
import { useEffect, useMemo } from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import type { BotOrganization } from '../../../../../shared/orca-fork/organization/bot-organization'
import {
  forkWorkspaceShowsDepartment,
  forkWorkspaceUnclaimedDepartments
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { useBotOrganization } from '../organization/bot-organization-store'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { forkWorkspacesStore, useForkWorkspaces } from './fork-workspaces-store'

export function claimForkWorkspaceDepartment(departmentId: string): void {
  if (FORK_FEATURES.workspaces) {
    const { activeWorkspaceId } = forkWorkspacesStore.get()
    forkWorkspacesStore.edit(forkWorkspaceEdits.claimDepartments(activeWorkspaceId, [departmentId]))
  }
}

export function useForkWorkspaceDepartments(doc: BotOrganization): BotOrganization {
  const workspaces = useForkWorkspaces()
  return useMemo(() => {
    if (!FORK_FEATURES.workspaces) {
      return doc
    }
    const departments = doc.departments.filter((dept) =>
      forkWorkspaceShowsDepartment(workspaces, workspaces.activeWorkspaceId, dept.id)
    )
    if (departments.length === doc.departments.length) {
      return doc
    }
    // A bot placed in another workspace's department lists under "No department" here.
    const shown = new Set(departments.map((dept) => dept.id))
    const placements = Object.fromEntries(
      Object.entries(doc.placements).filter(([, placement]) => shown.has(placement.departmentId))
    )
    return { ...doc, departments, placements }
  }, [doc, workspaces])
}

/** Gives every department no workspace holds to the workspace of its bots (or this computer's). */
export function useForkWorkspaceDepartmentMigration(): void {
  const organization = useBotOrganization()
  const workspaces = useForkWorkspaces()
  const ready = forkWorkspacesStore.useReady()
  useEffect(() => {
    if (!FORK_FEATURES.workspaces || !ready || organization.departments.length === 0) {
      return
    }
    const moves = forkWorkspaceUnclaimedDepartments(
      workspaces,
      organization.departments.map((dept) => dept.id),
      organization.placements
    )
    for (const [workspaceId, departmentIds] of moves) {
      forkWorkspacesStore.edit(forkWorkspaceEdits.claimDepartments(workspaceId, departmentIds))
    }
  }, [ready, organization, workspaces])
}
