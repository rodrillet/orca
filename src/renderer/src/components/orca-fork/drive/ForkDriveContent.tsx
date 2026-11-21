// orca-fork: the Drive's folders and files, as a grid of previews or a list, grouped by date when
// sorted by date.
import { useState, type MouseEvent } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveEntry, DriveFolderEntry } from './drive-host-data'
import { groupDriveFilesByDate, type DriveLayout, type DriveSort } from './drive-view-model'
import type { DriveItemHandlers } from './ForkDriveItemMenu'
import {
  DriveFileCard,
  DriveFileRow,
  DriveFolderCard,
  DriveFolderRow,
  DriveListHeader
} from './ForkDriveItems'

export type DriveItemKey = string

export function driveItemKey(kind: 'file' | 'folder', hostId: string, id: string): DriveItemKey {
  return `${kind}\u0000${hostId}\u0000${id}`
}

export type DriveContentProps = {
  workspaceId: DriveWorkspaceId | null
  layout: DriveLayout
  sort: DriveSort
  folders: readonly DriveFolderEntry[]
  files: readonly DriveEntry[]
  selected: ReadonlySet<DriveItemKey>
  folderCount: (folder: DriveFolderEntry) => number
  machineOf: (hostId: string) => string | null
  onPickFile: (file: DriveEntry, event: MouseEvent) => void
  onPickFolder: (folder: DriveFolderEntry, event: MouseEvent) => void
  onToggle: (key: DriveItemKey) => void
  fileHandlers: (file: DriveEntry) => DriveItemHandlers
  folderHandlers: (folder: DriveFolderEntry) => DriveItemHandlers
}

function GroupTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="px-1 pb-2 pt-4 text-xs font-semibold text-muted-foreground first:pt-0">
      {children}
    </h2>
  )
}

export function ForkDriveContent(props: DriveContentProps): React.JSX.Element {
  const t = useTranslate()
  const { layout, sort, folders, files, selected } = props
  // Date groups are fixed from when the page opened.
  const [now] = useState(() => Date.now())
  const groups =
    sort === 'recent'
      ? groupDriveFilesByDate(files, now).map(({ group, files: list }) => ({
          title: t(`orcaFork.drive.when.${group}`, group),
          files: list
        }))
      : [{ title: null, files: [...files] }]
  const folderItems = folders.map((folder) => {
    const key = driveItemKey('folder', folder.hostId, folder.id)
    const common = {
      folder,
      count: props.folderCount(folder),
      selected: selected.has(key),
      onPick: (event: MouseEvent) => props.onPickFolder(folder, event),
      onToggle: () => props.onToggle(key),
      handlers: props.folderHandlers(folder),
      machine: props.machineOf(folder.hostId)
    }
    return layout === 'grid' ? (
      <DriveFolderCard key={key} {...common} />
    ) : (
      <DriveFolderRow key={key} {...common} />
    )
  })
  const fileItem = (file: DriveEntry): React.JSX.Element => {
    const key = driveItemKey('file', file.hostId, file.id)
    const common = {
      file,
      selected: selected.has(key),
      onPick: (event: MouseEvent) => props.onPickFile(file, event),
      onToggle: () => props.onToggle(key),
      handlers: props.fileHandlers(file),
      machine: props.machineOf(file.hostId)
    }
    return layout === 'grid' ? (
      <DriveFileCard key={key} workspaceId={props.workspaceId} {...common} />
    ) : (
      <DriveFileRow key={key} {...common} />
    )
  }
  if (layout === 'list') {
    return (
      <div className="flex min-w-0 flex-col">
        <DriveListHeader />
        {folderItems}
        {groups.map((group) => (
          <section key={group.title ?? 'all'}>
            {group.title ? <GroupTitle>{group.title}</GroupTitle> : null}
            {group.files.map(fileItem)}
          </section>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      {folderItems.length > 0 ? (
        <section className="pb-2">
          <GroupTitle>{t('orcaFork.drive.folders', 'Folders')}</GroupTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {folderItems}
          </div>
        </section>
      ) : null}
      {groups.map((group) => (
        <section key={group.title ?? 'all'} className="pb-2">
          {group.title ? <GroupTitle>{group.title}</GroupTitle> : null}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {group.files.map(fileItem)}
          </div>
        </section>
      ))}
    </div>
  )
}
