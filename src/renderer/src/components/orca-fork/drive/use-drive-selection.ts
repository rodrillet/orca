// orca-fork: the Drive page's picked files and folders, resolved against what it shows.
import { useCallback, useMemo, useState } from 'react'
import type { DriveEntry, DriveFolderEntry } from './drive-host-data'
import { driveItemKey, type DriveItemKey } from './ForkDriveContent'
import type { DriveSelection } from './use-drive-actions'

export function useDriveSelection(shown: { files: DriveEntry[]; folders: DriveFolderEntry[] }) {
  const [keys, setKeys] = useState<ReadonlySet<DriveItemKey>>(() => new Set())
  const toggle = useCallback((key: DriveItemKey) => {
    setKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])
  const clear = useCallback(() => setKeys(new Set()), [])
  const selectAll = useCallback(() => {
    setKeys(
      new Set([
        ...shown.files.map((file) => driveItemKey('file', file.hostId, file.id)),
        ...shown.folders.map((folder) => driveItemKey('folder', folder.hostId, folder.id))
      ])
    )
  }, [shown])
  // What is picked and still shown; a filter change drops the rest from view, not from the set.
  const selection = useMemo<DriveSelection>(
    () => ({
      files: shown.files.filter((file) => keys.has(driveItemKey('file', file.hostId, file.id))),
      folders: shown.folders.filter((folder) =>
        keys.has(driveItemKey('folder', folder.hostId, folder.id))
      )
    }),
    [shown, keys]
  )
  return { keys, toggle, clear, selectAll, selection }
}
