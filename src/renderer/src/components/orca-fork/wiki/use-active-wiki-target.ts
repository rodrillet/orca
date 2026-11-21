// orca-fork: where the active workspace's wiki lives: its machine, keyed `home` on that machine when
// it is the machine's home workspace (agents there need no flag), else by the workspace id.
import { useMemo } from 'react'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import {
  activeForkWorkspace,
  forkWorkspaceHomeOf
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import { DEFAULT_FORK_WIKI_WORKSPACE_ID } from '../../../../../shared/orca-fork/wiki/wiki-types'
import type { WikiTarget } from './wiki-rpc'

export function useActiveWikiTarget(): { target: WikiTarget; routable: boolean } {
  const doc = useForkWorkspaces()
  return useMemo(() => {
    const workspace = activeForkWorkspace(doc)
    const home = forkWorkspaceHomeOf(doc, workspace.hostId)?.id === workspace.id
    return {
      target: {
        hostId: workspace.hostId,
        workspaceId: home ? DEFAULT_FORK_WIKI_WORKSPACE_ID : workspace.id
      },
      // This app reaches its own runtime and paired servers; an SSH machine has no runtime to keep it.
      routable:
        workspace.hostId === LOCAL_EXECUTION_HOST_ID || workspace.hostId.startsWith('runtime:')
    }
  }, [doc])
}
