// orca-fork: which fork workspace a Drive item belongs to. An item put in a workspace keeps it; a
// bot's file follows the bot's workspace; anything else belongs to its machine's home workspace.
import type { ExecutionHostId } from '../../execution-host/execution-host'
import {
  forkWorkspaceHomeOf,
  forkWorkspaceOfItem,
  type ForkWorkspaceId,
  type ForkWorkspacesDocument
} from '../workspaces/fork-workspace'
import type { DriveFileSource } from './drive-types'

export type DrivePlaceable = {
  hostId: ExecutionHostId
  workspaceId?: ForkWorkspaceId
  source?: DriveFileSource
}

export function driveItemWorkspaceId(
  doc: ForkWorkspacesDocument,
  item: DrivePlaceable
): ForkWorkspaceId | null {
  if (item.workspaceId && doc.workspaces.some((ws) => ws.id === item.workspaceId)) {
    return item.workspaceId
  }
  const botId = item.source && item.source.kind !== 'upload' ? item.source.botId : undefined
  if (botId) {
    return forkWorkspaceOfItem(doc, item.hostId, { botKey: `${item.hostId}/${botId}` })?.id ?? null
  }
  return forkWorkspaceHomeOf(doc, item.hostId)?.id ?? null
}
