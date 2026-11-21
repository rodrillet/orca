// orca-fork: the renderer's door to userData/orca-fork/workspaces.json.
import { ipcRenderer } from 'electron'
import type { ForkWorkspacesDocument } from '../../../shared/orca-fork/workspaces/fork-workspace'

export type ForkWorkspacesApi = {
  read: () => Promise<ForkWorkspacesDocument>
  write: (doc: ForkWorkspacesDocument) => Promise<ForkWorkspacesDocument>
}

export const forkWorkspacesApi: ForkWorkspacesApi = {
  read: () => ipcRenderer.invoke('orcaFork:workspaces:read'),
  write: (doc) => ipcRenderer.invoke('orcaFork:workspaces:write', doc)
}
