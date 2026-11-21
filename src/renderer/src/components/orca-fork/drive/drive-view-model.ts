// orca-fork: what the Drive page shows for its folder, filters, search and order.
import type { DriveFileKind } from '../../../../../shared/orca-fork/drive/drive-types'
import { getIntlLocale } from '@/i18n/i18n'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { DriveEntry, DriveFolderEntry } from './drive-host-data'

/** Names in natural order ("file 2" before "file 10"). */
export const DRIVE_NAME_COLLATOR = new Intl.Collator(getIntlLocale(), { numeric: true })

export type DriveWho = 'all' | 'agents' | 'me'
export type DriveSort = 'recent' | 'name' | 'size'
export type DriveLayout = 'grid' | 'list'
export type DriveFolderRef = { hostId: ExecutionHostId; id: string }
export type DriveChatRef = { hostId: ExecutionHostId; sessionId: string }

export type DriveFilters = {
  query: string
  who: DriveWho
  kinds: readonly DriveFileKind[]
  /** `${hostId}\0${botId}` keys. */
  bots: readonly string[]
  hostId: ExecutionHostId | null
  chat: DriveChatRef | null
}

export const EMPTY_DRIVE_FILTERS: DriveFilters = {
  query: '',
  who: 'all',
  kinds: [],
  bots: [],
  hostId: null,
  chat: null
}

export function driveBotKey(hostId: string, botId: string): string {
  return `${hostId}\u0000${botId}`
}

export function isFiltering(filters: DriveFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.who !== 'all' ||
    filters.kinds.length > 0 ||
    filters.bots.length > 0 ||
    filters.chat !== null
  )
}

function folderKey(hostId: string, id: string): string {
  return `${hostId}\u0000${id}`
}

/** Folders in the trash, or inside one that is. */
export function trashedFolderKeys(folders: readonly DriveFolderEntry[]): Set<string> {
  const byKey = new Map(folders.map((folder) => [folderKey(folder.hostId, folder.id), folder]))
  const trashed = new Set<string>()
  for (const folder of folders) {
    for (
      let at: DriveFolderEntry | undefined = folder;
      at;
      at = at.parentId ? byKey.get(folderKey(at.hostId, at.parentId)) : undefined
    ) {
      if (at.trashedAt !== null) {
        trashed.add(folderKey(folder.hostId, folder.id))
        break
      }
    }
  }
  return trashed
}

function fileIsTrashed(file: DriveEntry, trashed: Set<string>): boolean {
  return (
    file.trashedAt !== null ||
    (file.folderId !== null && trashed.has(folderKey(file.hostId, file.folderId)))
  )
}

function matchesQuery(file: DriveEntry, needle: string): boolean {
  if (!needle) {
    return true
  }
  const source = file.source
  const haystack = [
    file.name,
    source.kind === 'upload' ? '' : (source.botName ?? ''),
    source.kind === 'agent' ? (source.note ?? '') : '',
    source.kind === 'chat-attachment' ? (source.excerpt ?? '') : ''
  ]
    .join('\n')
    .toLocaleLowerCase()
  return haystack.includes(needle)
}

function matchesFilters(file: DriveEntry, filters: DriveFilters): boolean {
  const source = file.source
  if (filters.who === 'agents' && source.kind !== 'agent') {
    return false
  }
  if (filters.who === 'me' && source.kind === 'agent') {
    return false
  }
  if (filters.kinds.length > 0 && !filters.kinds.includes(file.kind)) {
    return false
  }
  if (filters.hostId && file.hostId !== filters.hostId) {
    return false
  }
  if (filters.bots.length > 0) {
    if (source.kind === 'upload' || !source.botId) {
      return false
    }
    if (!filters.bots.includes(driveBotKey(file.hostId, source.botId))) {
      return false
    }
  }
  if (filters.chat) {
    if (
      source.kind === 'upload' ||
      source.sessionId !== filters.chat.sessionId ||
      file.hostId !== filters.chat.hostId
    ) {
      return false
    }
  }
  return true
}

export function sortDriveFiles(files: readonly DriveEntry[], sort: DriveSort): DriveEntry[] {
  const sorted = [...files]
  if (sort === 'name') {
    sorted.sort((a, b) => DRIVE_NAME_COLLATOR.compare(a.name, b.name))
  } else if (sort === 'size') {
    sorted.sort((a, b) => b.byteLength - a.byteLength)
  } else {
    sorted.sort((a, b) => b.updatedAt - a.updatedAt)
  }
  return sorted
}

export type DriveShown = {
  folders: DriveFolderEntry[]
  files: DriveEntry[]
}

/** Browsing shows one folder; a search or a filter looks through the whole Drive. */
export function driveShown(input: {
  files: readonly DriveEntry[]
  folders: readonly DriveFolderEntry[]
  filters: DriveFilters
  folder: DriveFolderRef | null
  sort: DriveSort
  trash: boolean
}): DriveShown {
  const { filters, folder, sort, trash } = input
  const trashed = trashedFolderKeys(input.folders)
  const needle = filters.query.trim().toLocaleLowerCase()
  const onHost = (hostId: string): boolean => !filters.hostId || hostId === filters.hostId
  if (trash) {
    // Only what was put in the trash itself, not what a trashed folder holds.
    return {
      folders: input.folders.filter(
        (entry) =>
          entry.trashedAt !== null &&
          onHost(entry.hostId) &&
          !(entry.parentId && trashed.has(folderKey(entry.hostId, entry.parentId)))
      ),
      files: sortDriveFiles(
        input.files.filter(
          (file) =>
            file.trashedAt !== null &&
            onHost(file.hostId) &&
            !(file.folderId && trashed.has(folderKey(file.hostId, file.folderId))) &&
            matchesQuery(file, needle)
        ),
        sort
      )
    }
  }
  const live = input.files.filter((file) => !fileIsTrashed(file, trashed))
  if (isFiltering(filters)) {
    const folders =
      needle &&
      filters.who === 'all' &&
      filters.kinds.length === 0 &&
      filters.bots.length === 0 &&
      !filters.chat
        ? input.folders.filter(
            (entry) =>
              !trashed.has(folderKey(entry.hostId, entry.id)) &&
              onHost(entry.hostId) &&
              entry.name.toLocaleLowerCase().includes(needle)
          )
        : []
    return {
      folders,
      files: sortDriveFiles(
        live.filter((file) => matchesFilters(file, filters) && matchesQuery(file, needle)),
        sort
      )
    }
  }
  const inFolder = (hostId: string, parentId: string | null): boolean =>
    folder ? hostId === folder.hostId && parentId === folder.id : parentId === null
  return {
    folders: input.folders
      .filter(
        (entry) =>
          entry.trashedAt === null && onHost(entry.hostId) && inFolder(entry.hostId, entry.parentId)
      )
      .sort((a, b) => DRIVE_NAME_COLLATOR.compare(a.name, b.name)),
    files: sortDriveFiles(
      live.filter((file) => onHost(file.hostId) && inFolder(file.hostId, file.folderId)),
      sort
    )
  }
}

/** The folder and its parents, top first; empty when it is gone. */
export function driveFolderTrail(
  folders: readonly DriveFolderEntry[],
  folder: DriveFolderRef | null
): DriveFolderEntry[] {
  if (!folder) {
    return []
  }
  const byKey = new Map(folders.map((entry) => [folderKey(entry.hostId, entry.id), entry]))
  const trail: DriveFolderEntry[] = []
  for (
    let at = byKey.get(folderKey(folder.hostId, folder.id));
    at && trail.length < 64;
    at = at.parentId ? byKey.get(folderKey(at.hostId, at.parentId)) : undefined
  ) {
    trail.unshift(at)
  }
  return trail
}

export type DriveDateGroup = 'today' | 'yesterday' | 'week' | 'month' | 'earlier'

export function driveDateGroup(at: number, now: number): DriveDateGroup {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const today = startOfToday.getTime()
  const day = 24 * 60 * 60 * 1000
  if (at >= today) {
    return 'today'
  }
  if (at >= today - day) {
    return 'yesterday'
  }
  if (at >= today - 6 * day) {
    return 'week'
  }
  if (at >= today - 29 * day) {
    return 'month'
  }
  return 'earlier'
}

/** Files by when they last changed, newest group first; only `recent` order is grouped. */
export function groupDriveFilesByDate(
  files: readonly DriveEntry[],
  now: number
): { group: DriveDateGroup; files: DriveEntry[] }[] {
  const groups = new Map<DriveDateGroup, DriveEntry[]>()
  for (const file of files) {
    const group = driveDateGroup(file.updatedAt, now)
    const list = groups.get(group)
    if (list) {
      list.push(file)
    } else {
      groups.set(group, [file])
    }
  }
  const order: DriveDateGroup[] = ['today', 'yesterday', 'week', 'month', 'earlier']
  return order.flatMap((group) => {
    const list = groups.get(group)
    return list ? [{ group, files: list }] : []
  })
}

export function formatDriveBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}
