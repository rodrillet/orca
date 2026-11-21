// orca-fork: the Workspaces document in the renderer. Other fork features read the active workspace
// id from here to key their data (`useActiveForkWorkspaceId`).
import {
  activeForkWorkspace,
  emptyForkWorkspaces,
  normalizeForkWorkspaces,
  type ForkWorkspace,
  type ForkWorkspaceId,
  type ForkWorkspacesDocument
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { createForkDocumentStore } from '../fork-document-store'

export const forkWorkspacesStore = createForkDocumentStore<ForkWorkspacesDocument>({
  storageKey: 'orca-fork:workspaces',
  empty: () => emptyForkWorkspaces(),
  normalize: (raw) => normalizeForkWorkspaces(raw),
  bridge: () => window.api?.orcaForkWorkspaces
})

export function useForkWorkspaces(): ForkWorkspacesDocument {
  return forkWorkspacesStore.use()
}

export function useActiveForkWorkspace(): ForkWorkspace {
  return activeForkWorkspace(forkWorkspacesStore.use())
}

export function useActiveForkWorkspaceId(): ForkWorkspaceId {
  return forkWorkspacesStore.use().activeWorkspaceId
}

/** For non-React code (stores, IPC handlers). */
export function getActiveForkWorkspaceId(): ForkWorkspaceId {
  return forkWorkspacesStore.get().activeWorkspaceId
}
