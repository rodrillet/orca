// orca-fork: the Drive follows the active fork workspace: it reads that workspace's machine and keeps
// the items placed in it (put there, its bots', or its machine's when it is the home workspace).
// With workspaces off it shows every machine's Drive.
import { useMemo } from 'react'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import {
  driveItemWorkspaceId,
  type DrivePlaceable
} from '../../../../../shared/orca-fork/drive/drive-workspace-placement'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { activeForkWorkspace } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import { useDriveData, type DriveData } from './drive-host-data'

export type DriveWorkspaceScope = {
  workspaceId: DriveWorkspaceId | null
  /** The workspace's machine; null reads every machine. */
  hostId: ExecutionHostId | null
  contains: (item: DrivePlaceable) => boolean
}

const EVERYTHING: DriveWorkspaceScope = { workspaceId: null, hostId: null, contains: () => true }

export function useDriveWorkspaceScope(): DriveWorkspaceScope {
  const doc = useForkWorkspaces()
  return useMemo(() => {
    if (!FORK_FEATURES.workspaces) {
      return EVERYTHING
    }
    const active = activeForkWorkspace(doc)
    return {
      workspaceId: active.id,
      hostId: active.hostId,
      contains: (item: DrivePlaceable) => driveItemWorkspaceId(doc, item) === active.id
    }
  }, [doc])
}

/** The Drive of the shown workspace: its machine's, with only the items placed in it. */
export function useScopedDriveData(): { scope: DriveWorkspaceScope; data: DriveData } {
  const scope = useDriveWorkspaceScope()
  const read = useDriveData(scope.workspaceId, scope.hostId)
  const data = useMemo(
    () => ({
      ...read,
      files: read.files.filter(scope.contains),
      folders: read.folders.filter(scope.contains)
    }),
    [read, scope]
  )
  return { scope, data }
}
