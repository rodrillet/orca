// orca-fork: the Drive index's edits (folders, rename, move, trash, delete), pure so the store
// applies each inside one serialized write.
import { randomUUID } from 'node:crypto'
import { sanitizeAgentSessionAttachmentName } from '../../../shared/agent-session/agent-session-attachments'
import {
  driveFileKindOf,
  driveMimeTypeOf,
  type DriveFile,
  type DriveFolder
} from '../../../shared/orca-fork/drive/drive-types'
import type {
  ForkDriveDeleteInput,
  ForkDriveUpdateInput
} from '../../../shared/orca-fork/drive/drive-rpc-params'
import type { ForkWorkspaceId } from '../../../shared/orca-fork/workspaces/fork-workspace'

/** A file record as stored: `originKey` keeps one capture of the same source to one file. */
export type StoredFile = DriveFile & { originKey?: string }

export type DriveIndex = { version: number; files: StoredFile[]; folders: DriveFolder[] }

export class DriveFolderNotFoundError extends Error {
  constructor() {
    super('Folder is not in the Drive')
    this.name = 'DriveFolderNotFoundError'
  }
}

export function assertDriveFolder(
  index: DriveIndex,
  folderId: string | null | undefined
): string | null {
  if (!folderId) {
    return null
  }
  if (!index.folders.some((folder) => folder.id === folderId)) {
    throw new DriveFolderNotFoundError()
  }
  return folderId
}

export function addDriveFolder(
  index: DriveIndex,
  name: string,
  parentId: string | null,
  workspaceId?: ForkWorkspaceId
): DriveFolder {
  const folder: DriveFolder = {
    id: randomUUID(),
    name: name.trim(),
    parentId: assertDriveFolder(index, parentId),
    createdAt: Date.now(),
    trashedAt: null,
    ...(workspaceId ? { workspaceId } : {})
  }
  index.folders.push(folder)
  return folder
}

export function ensureDriveFolderPath(
  index: DriveIndex,
  parts: readonly string[],
  workspaceId?: ForkWorkspaceId
): string | null {
  let parentId: string | null = null
  for (const part of parts) {
    const lower = part.toLocaleLowerCase()
    let folder = index.folders.find(
      (entry) =>
        entry.parentId === parentId &&
        entry.trashedAt === null &&
        entry.workspaceId === workspaceId &&
        entry.name.toLocaleLowerCase() === lower
    )
    if (!folder) {
      folder = {
        id: randomUUID(),
        name: part,
        parentId,
        createdAt: Date.now(),
        trashedAt: null,
        ...(workspaceId ? { workspaceId } : {})
      }
      index.folders.push(folder)
    }
    parentId = folder.id
  }
  return parentId
}

function descendantFolderIds(index: DriveIndex, roots: Iterable<string>): Set<string> {
  const found = new Set(roots)
  let grew = true
  while (grew) {
    grew = false
    for (const folder of index.folders) {
      if (folder.parentId && found.has(folder.parentId) && !found.has(folder.id)) {
        found.add(folder.id)
        grew = true
      }
    }
  }
  return found
}

function isInTrash(index: DriveIndex, folderId: string): boolean {
  const byId = new Map(index.folders.map((folder) => [folder.id, folder]))
  const seen = new Set<string>()
  for (
    let at = byId.get(folderId);
    at && !seen.has(at.id);
    at = at.parentId ? byId.get(at.parentId) : undefined
  ) {
    seen.add(at.id)
    if (at.trashedAt !== null) {
      return true
    }
  }
  return false
}

export function applyDriveUpdate(
  index: DriveIndex,
  input: ForkDriveUpdateInput,
  now: number
): { files: number; folders: number } {
  const fileIds = new Set(input.fileIds ?? [])
  const folderIds = new Set(input.folderIds ?? [])
  const moveTo = input.moveTo === undefined ? undefined : assertDriveFolder(index, input.moveTo)
  if (moveTo && descendantFolderIds(index, folderIds).has(moveTo)) {
    throw new Error('A folder cannot move into itself')
  }
  let files = 0
  let folders = 0
  for (const file of index.files) {
    if (!fileIds.has(file.id)) {
      continue
    }
    files++
    if (input.name !== undefined) {
      file.name = sanitizeAgentSessionAttachmentName(input.name)
      file.kind = driveFileKindOf(file.name)
      file.mimeType = driveMimeTypeOf(file.name)
    }
    if (moveTo !== undefined) {
      file.folderId = moveTo
    }
    if (input.trashed !== undefined) {
      file.trashedAt = input.trashed ? now : null
      // A file restored out of a folder still in the trash goes to the top level.
      if (!input.trashed && file.folderId && isInTrash(index, file.folderId)) {
        file.folderId = null
      }
    }
    file.updatedAt = now
  }
  for (const folder of index.folders) {
    if (!folderIds.has(folder.id)) {
      continue
    }
    folders++
    if (input.name !== undefined) {
      folder.name = input.name.trim()
    }
    if (moveTo !== undefined) {
      folder.parentId = moveTo
    }
    if (input.trashed !== undefined) {
      folder.trashedAt = input.trashed ? now : null
      if (!input.trashed && folder.parentId && isInTrash(index, folder.parentId)) {
        folder.parentId = null
      }
    }
  }
  return { files, folders }
}

/** Removes the named files, the named folders with all they hold, or the whole trash. */
export function applyDriveDelete(
  index: DriveIndex,
  input: ForkDriveDeleteInput
): { removedFileIds: string[]; files: number; folders: number } {
  const rootFolders = input.emptyTrash
    ? index.folders.filter((folder) => folder.trashedAt !== null).map((folder) => folder.id)
    : (input.folderIds ?? [])
  const folderIds = descendantFolderIds(index, rootFolders)
  const fileIds = new Set(input.fileIds ?? [])
  const removedFileIds: string[] = []
  index.files = index.files.filter((file) => {
    const doomed =
      fileIds.has(file.id) ||
      (file.folderId !== null && folderIds.has(file.folderId)) ||
      (input.emptyTrash === true && file.trashedAt !== null)
    if (doomed) {
      removedFileIds.push(file.id)
    }
    return !doomed
  })
  const before = index.folders.length
  index.folders = index.folders.filter((folder) => !folderIds.has(folder.id))
  return { removedFileIds, files: removedFileIds.length, folders: before - index.folders.length }
}
