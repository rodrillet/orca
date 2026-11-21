// orca-fork: everything below the switcher shows only the active workspace: its machine's projects
// (through the sidebar's own host and project filters), its Activity agents and its bots.
import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  DEFAULT_FORK_WORKSPACE_ID,
  activeForkWorkspace,
  forkWorkspaceOfItem,
  forkWorkspaceProjectsToClaim,
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

  const localLabel = machines.find((m) => !m.paired)?.label
  useEffect(() => {
    if (!FORK_FEATURES.workspaces || !ready) {
      return
    }
    // A fresh document's workspace takes this computer's name ("Local Mac") in the UI language.
    if (localLabel && forkWorkspacesStore.get().revision === 0) {
      forkWorkspacesStore.edit(
        forkWorkspaceEdits.update(DEFAULT_FORK_WORKSPACE_ID, { name: localLabel })
      )
    }
    if (paired.length > 0) {
      forkWorkspacesStore.edit(forkWorkspaceEdits.ensureMachines(paired, Date.now()))
    }
  }, [ready, paired, localLabel])

  const active = activeForkWorkspace(doc)
  const hostedRepos = useMemo(
    () => repos.map((repo) => ({ id: repo.id, hostId: getRepoExecutionHostId(repo) })),
    [repos]
  )
  const repoFilter = useMemo(
    () => forkWorkspaceRepoFilter(doc, active.id, hostedRepos),
    [doc, active.id, hostedRepos]
  )
  // With this computer alone there is nothing to narrow, and the sidebar's filter badge stays quiet.
  const onlyMachine = machines.length < 2
  const hostIds = useMemo(
    () => (onlyMachine ? null : [active.hostId]),
    [onlyMachine, active.hostId]
  )
  const scope = `${hostIds?.join(',') ?? '*'}|${repoFilter.join(',')}`

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

  const storeRepoFilter = useAppStore((s) => s.filterRepoIds)
  useEffect(() => {
    if (!FORK_FEATURES.workspaces || !ready || appliedScope !== scope) {
      return
    }
    // Read after the effect above, which may have just written it on a workspace switch.
    const current = useAppStore.getState().filterRepoIds
    // A catalog refresh drops ids no repo has, which would turn "no projects" into "every project".
    if (current.length === 0 && repoFilter.length > 0) {
      useAppStore.getState().setFilterRepoIds(repoFilter)
      return
    }
    for (const repoId of forkWorkspaceProjectsToClaim(doc, active.id, current, hostedRepos)) {
      forkWorkspacesStore.edit(forkWorkspaceEdits.move(active.hostId, { repoId }, active.id))
    }
  }, [ready, scope, storeRepoFilter, repoFilter, doc, active.id, active.hostId, hostedRepos])
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
