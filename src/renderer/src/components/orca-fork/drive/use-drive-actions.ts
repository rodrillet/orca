// orca-fork: the Drive page's writes, each on the computer that keeps the item, then a re-read.
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import { callDrive, driveScope, type DriveEntry, type DriveFolderEntry } from './drive-host-data'
import { downloadDriveFile, uploadDriveFile } from './drive-transfer'

export type DriveSelection = { files: DriveEntry[]; folders: DriveFolderEntry[] }

/** One call per computer the selection spans. */
function byHost(
  selection: DriveSelection
): Map<ExecutionHostId, { fileIds: string[]; folderIds: string[] }> {
  const hosts = new Map<ExecutionHostId, { fileIds: string[]; folderIds: string[] }>()
  const entry = (hostId: ExecutionHostId): { fileIds: string[]; folderIds: string[] } => {
    let found = hosts.get(hostId)
    if (!found) {
      found = { fileIds: [], folderIds: [] }
      hosts.set(hostId, found)
    }
    return found
  }
  selection.files.forEach((file) => entry(file.hostId).fileIds.push(file.id))
  selection.folders.forEach((folder) => entry(folder.hostId).folderIds.push(folder.id))
  return hosts
}

/** One write: its toast on success or failure, then a re-read either way. */
async function runDriveAction(
  work: () => Promise<unknown>,
  then: { done?: string; fail: (error: unknown) => void; refresh: () => void }
): Promise<boolean> {
  try {
    await work()
    if (then.done) {
      toast.success(then.done)
    }
    return true
  } catch (error) {
    then.fail(error)
    return false
  } finally {
    then.refresh()
  }
}

export function useDriveActions(workspaceId: DriveWorkspaceId | null, refresh: () => void) {
  const t = useTranslate()
  return useMemo(() => {
    const fail = (error: unknown): void => {
      console.error('[orca-fork drive]', error)
      toast.error(t('orcaFork.drive.actionFailed', 'The Drive could not do that.'), {
        description: error instanceof Error ? error.message : undefined
      })
    }
    const run = (work: () => Promise<unknown>, done?: string): Promise<boolean> =>
      runDriveAction(work, { done, fail, refresh })
    const update = (selection: DriveSelection, change: Record<string, unknown>): Promise<unknown> =>
      Promise.all(
        [...byHost(selection)].map(([hostId, ids]) =>
          callDrive(hostId, 'update', { ...driveScope(workspaceId), ...ids, ...change })
        )
      )
    return {
      upload: async (hostId: ExecutionHostId, files: File[], folderId: string | null) => {
        let saved = 0
        const progress = toast.loading(
          t('orcaFork.drive.uploading', 'Uploading {{count}} file(s)…', { count: files.length })
        )
        for (const file of files) {
          try {
            await uploadDriveFile(hostId, workspaceId, file, folderId)
            saved++
          } catch (error) {
            fail(error)
          }
        }
        toast.dismiss(progress)
        if (saved > 0) {
          toast.success(
            t('orcaFork.drive.uploaded', '{{count}} file(s) uploaded', { count: saved })
          )
        }
        refresh()
      },
      download: (file: DriveEntry) => run(() => downloadDriveFile(file, workspaceId)),
      rename: (selection: DriveSelection, name: string) => run(() => update(selection, { name })),
      move: (selection: DriveSelection, moveTo: string | null) =>
        run(() => update(selection, { moveTo }), t('orcaFork.drive.moved', 'Moved')),
      trash: (selection: DriveSelection) =>
        run(
          () => update(selection, { trashed: true }),
          t('orcaFork.drive.trashed', 'Moved to trash')
        ),
      restore: (selection: DriveSelection) =>
        run(() => update(selection, { trashed: false }), t('orcaFork.drive.restored', 'Restored')),
      deleteForever: (selection: DriveSelection) =>
        run(
          () =>
            Promise.all(
              [...byHost(selection)].map(([hostId, ids]) =>
                callDrive(hostId, 'delete', { ...driveScope(workspaceId), ...ids })
              )
            ),
          t('orcaFork.drive.deleted', 'Deleted forever')
        ),
      createFolder: (hostId: ExecutionHostId, name: string, parentId: string | null) =>
        run(() => callDrive(hostId, 'folderCreate', { ...driveScope(workspaceId), name, parentId }))
    }
  }, [workspaceId, refresh, t])
}

export type DriveActions = ReturnType<typeof useDriveActions>
