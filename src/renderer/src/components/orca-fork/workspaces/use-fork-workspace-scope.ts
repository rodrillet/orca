// orca-fork: everything below the switcher shows only the active workspace: its machine's projects
// (through the sidebar's own host and project filters), its Activity agents and its bots.
import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  activeForkWorkspace,
  forkWorkspaceOfItem,
  forkWorkspaceRepoFilter
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { forkWorkspacesStore, useForkWorkspaces } from './fork-workspaces-store'
import type { ForkWorkspaceMachine } from './use-fork-workspace-machines'

// The scope last written to the sidebar filters, so a filter the owner changes by hand stays until
// the workspace or its projects change.
let appliedScope: string | null = null

export function useForkWorkspaceScope(machines: readonly ForkWorkspaceMachine[]): void {
  const doc = useForkWorkspaces()
  const ready = forkWorkspacesStore.useReady()
  const repos = useAppStore((s) => s.repos)
  const paired = useMemo(
    () => machines.filter((m) => m.paired).map((m) => ({ hostId: m.hostId, name: m.label })),
    [machines]
  )

  useEffect(() => {
    if (FORK_FEATURES.workspaces && ready && paired.length > 0) {
      forkWorkspacesStore.edit(forkWorkspaceEdits.ensureMachines(paired, Date.now()))
    }
  }, [ready, paired])

  const active = activeForkWorkspace(doc)
  const repoFilter = useMemo(
    () =>
      forkWorkspaceRepoFilter(
        doc,
        active.id,
        repos.map((repo) => ({ id: repo.id, hostId: getRepoExecutionHostId(repo) }))
      ),
    [doc, active.id, repos]
  )
  const hostIds = useMemo(() => [active.hostId], [active.hostId])
  const scope = `${hostIds.join(',')}|${repoFilter.join(',')}`

  useEffect(() => {
    if (!FORK_FEATURES.workspaces || !ready || appliedScope === scope) {
      return
    }
    appliedScope = scope
    const state = useAppStore.getState()
    state.setVisibleWorkspaceHostIds(hostIds)
    state.setAgentsVisibleHostIds(hostIds)
    state.setFilterRepoIds(repoFilter)
  }, [ready, scope, hostIds, repoFilter])
}

/** Bots or bot groups narrowed to the active workspace (their machine's, or the one they were moved to). */
export function useForkWorkspaceOwners<T extends Parameters<typeof botSidebarEntryKey>[0]>(
  owners: readonly T[]
): readonly T[] {
  const doc = useForkWorkspaces()
  return useMemo(() => {
    if (!FORK_FEATURES.workspaces) {
      return owners
    }
    return owners.filter(
      (owner) =>
        forkWorkspaceOfItem(doc, owner.hostId, { botKey: botSidebarEntryKey(owner) })?.id ===
        doc.activeWorkspaceId
    )
  }, [owners, doc])
}
