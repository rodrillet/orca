// orca-fork: the active workspace's projects on the icon rail (agentes.chat's channels there): each
// project's initials in its color; a click opens its most recently used worktree.
import React, { useMemo } from 'react'
import { useAppStore } from '@/store'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { activateAndRevealWorktree } from '@/lib/workspace/activation/worktree-activation'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { forkWorkspaceOfItem } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { setForkSidebarMode } from './sidebar-mode-store'

/** "orca-server" → "Os", "web" → "We", so tiles tell projects apart without their names. */
function projectInitials(name: string): string {
  const words = name.split(/[\s._-]+/).filter(Boolean)
  const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2)
  return `${letters[0]?.toUpperCase() ?? '?'}${letters.slice(1).toLowerCase()}`
}

export type ForkRailTile = {
  key: string
  label: string
  active: boolean
  onClick: () => void
  content: React.ReactNode
}

export function useForkRailProjects(): ForkRailTile[] {
  const doc = useForkWorkspaces()
  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore(selectWorktreesByRepo)
  const activeRepoId = useAppStore((s) =>
    s.activeView === 'terminal' && s.activeWorktreeId
      ? (s.getKnownWorktreeById(s.activeWorktreeId)?.repoId ?? null)
      : null
  )
  return useMemo(
    () =>
      repos
        .filter(
          (repo) =>
            forkWorkspaceOfItem(doc, getRepoExecutionHostId(repo), { repoId: repo.id })?.id ===
            doc.activeWorkspaceId
        )
        .map((repo): ForkRailTile => {
          const latest = (worktreesByRepo[repo.id] ?? [])
            .filter((wt) => !wt.isArchived)
            .reduce<{ id: string; lastActivityAt: number } | null>(
              (best, wt) => (!best || wt.lastActivityAt > best.lastActivityAt ? wt : best),
              null
            )
          return {
            key: repo.id,
            label: repo.displayName,
            active: repo.id === activeRepoId,
            onClick: () => {
              // No worktree to open yet: the full sidebar shows the project and its actions.
              if (!latest || !activateAndRevealWorktree(latest.id)) {
                setForkSidebarMode('full')
              }
            },
            content: (
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: repo.badgeColor }}
              >
                {projectInitials(repo.displayName)}
              </span>
            )
          }
        }),
    [repos, doc, worktreesByRepo, activeRepoId]
  )
}
