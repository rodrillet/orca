// orca-fork: keeps the Workspaces document in userData/orca-fork/workspaces.json.
import { normalizeForkWorkspaces } from '../../../shared/orca-fork/workspaces/fork-workspace'
import { registerForkDocumentFile } from '../fork-document-file'

export function registerForkWorkspacesHandlers(): void {
  registerForkDocumentFile('workspaces', (raw) => normalizeForkWorkspaces(raw))
}
