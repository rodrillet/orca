// orca-fork: what each machine is told about its bots' and projects' workspaces, so `orca wiki` run by
// an agent there opens its own workspace's wiki. A machine's home workspace needs no entry (`home`).
import type { ExecutionHostId } from '../../execution-host/execution-host'
import { forkWorkspaceHomeOf, type ForkWorkspacesDocument } from '../workspaces/fork-workspace'

export type WikiHostPlacement = { bots: Record<string, string>; repos: Record<string, string> }

export function wikiPlacementByHost(
  doc: ForkWorkspacesDocument
): Map<ExecutionHostId, WikiHostPlacement> {
  const byHost = new Map<ExecutionHostId, WikiHostPlacement>()
  for (const workspace of doc.workspaces) {
    const placement = byHost.get(workspace.hostId) ?? { bots: {}, repos: {} }
    byHost.set(workspace.hostId, placement)
    if (forkWorkspaceHomeOf(doc, workspace.hostId)?.id === workspace.id) {
      continue
    }
    const prefix = `${workspace.hostId}/`
    for (const key of workspace.botKeys) {
      if (key.startsWith(prefix)) {
        placement.bots[key.slice(prefix.length)] = workspace.id
      }
    }
    for (const repoId of workspace.repoIds) {
      placement.repos[repoId] = workspace.id
    }
  }
  return byHost
}
