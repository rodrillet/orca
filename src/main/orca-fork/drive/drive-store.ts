// orca-fork: one host's Drive: userData/orca-fork/drive/index.json plus blobs/<file id>. The host that
// runs the bots keeps their files, so a paired server keeps its own. Fork workspaces are a desktop
// concept, so a file carries its workspace when one is known and the desktop places the rest.
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, open, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renameFileWithWindowsRetryAsync } from '../../../shared/file-write/windows-retry-file-operations'
import { sanitizeAgentSessionAttachmentName } from '../../../shared/agent-session/agent-session-attachments'
import {
  DRIVE_CHUNK_BYTES,
  DRIVE_FILE_MAX_BYTES,
  driveFileKindOf,
  driveMimeTypeOf,
  type DriveFile,
  type DriveFileSource,
  type DriveFolder,
  type DriveListResult,
  type DriveReadResult
} from '../../../shared/orca-fork/drive/drive-types'
import type { ForkWorkspaceId } from '../../../shared/orca-fork/workspaces/fork-workspace'
import type {
  ForkDriveDeleteInput,
  ForkDriveUpdateInput
} from '../../../shared/orca-fork/drive/drive-rpc-params'
import {
  addDriveFolder,
  applyDriveDelete,
  applyDriveUpdate,
  assertDriveFolder,
  ensureDriveFolderPath,
  type DriveIndex,
  type StoredFile
} from './drive-index-edits'
import { DriveUploads } from './drive-uploads'

const INDEX_VERSION = 1

export class DriveNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} is not in the Drive`)
    this.name = 'DriveNotFoundError'
  }
}

function publicFile({ originKey: _originKey, ...file }: StoredFile): DriveFile {
  return file
}

export type DriveAddInput = {
  name: string
  folderId?: string | null
  source: DriveFileSource
  workspaceId?: ForkWorkspaceId
  originKey?: string
}

export class DriveStore {
  private index: DriveIndex | null = null
  private queue: Promise<unknown> = Promise.resolve()
  readonly uploads: DriveUploads

  constructor(private readonly rootDir: string) {
    this.uploads = new DriveUploads(join(rootDir, 'uploads'))
  }

  private blobPath(fileId: string): string {
    return join(this.rootDir, 'blobs', fileId)
  }

  private async load(): Promise<DriveIndex> {
    if (this.index) {
      return this.index
    }
    let index: DriveIndex = { version: INDEX_VERSION, files: [], folders: [] }
    try {
      const parsed: unknown = JSON.parse(await readFile(join(this.rootDir, 'index.json'), 'utf8'))
      if (
        parsed &&
        typeof parsed === 'object' &&
        'files' in parsed &&
        'folders' in parsed &&
        Array.isArray(parsed.files) &&
        Array.isArray(parsed.folders)
      ) {
        index = { version: INDEX_VERSION, files: parsed.files, folders: parsed.folders }
      }
    } catch {
      // No index yet (or an unreadable one): an empty Drive.
    }
    this.index = index
    return index
  }

  private async save(index: DriveIndex): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
    const target = join(this.rootDir, 'index.json')
    const part = `${target}.${randomUUID()}.part`
    await writeFile(part, JSON.stringify(index), 'utf8')
    await renameFileWithWindowsRetryAsync(part, target)
  }

  /** Writes run one at a time, each saving the index it changed. */
  private mutate<T>(change: (index: DriveIndex) => Promise<T> | T): Promise<T> {
    const next = this.queue
      .catch(() => undefined)
      .then(async () => {
        const index = await this.load()
        const result = await change(index)
        await this.save(index)
        return result
      })
    this.queue = next
    return next
  }

  async list(): Promise<DriveListResult> {
    await this.queue.catch(() => undefined)
    const index = await this.load()
    return {
      files: index.files.map(publicFile),
      folders: index.folders.map((folder) => ({ ...folder }))
    }
  }

  /** Fills in what a capture could not know (the bot of a chat) once a caller can say. */
  async enrichSources(
    resolve: (sessionId: string) => { botId: string; botName: string } | null
  ): Promise<void> {
    const unresolved = (file: StoredFile): string | null =>
      file.source.kind !== 'upload' && file.source.sessionId && !file.source.botId
        ? file.source.sessionId
        : null
    if (!(await this.load()).files.some((file) => unresolved(file))) {
      return
    }
    await this.mutate((index) => {
      for (const file of index.files) {
        const sessionId = unresolved(file)
        const bot = sessionId ? resolve(sessionId) : null
        if (bot && file.source.kind !== 'upload') {
          file.source = { ...file.source, botId: bot.botId, botName: bot.botName }
        }
      }
    })
  }

  async read(fileId: string, offset = 0, maxBytes = DRIVE_CHUNK_BYTES): Promise<DriveReadResult> {
    const file = (await this.load()).files.find((entry) => entry.id === fileId)
    if (!file) {
      throw new DriveNotFoundError('File')
    }
    const handle = await open(this.blobPath(fileId), 'r')
    try {
      const { size } = await handle.stat()
      const length = Math.max(0, Math.min(maxBytes, size - offset))
      const buffer = Buffer.alloc(length)
      const { bytesRead } =
        length > 0 ? await handle.read(buffer, 0, length, offset) : { bytesRead: 0 }
      return {
        contentBase64: buffer.subarray(0, bytesRead).toString('base64'),
        offset,
        byteLength: bytesRead,
        totalBytes: size,
        mimeType: file.mimeType
      }
    } finally {
      await handle.close()
    }
  }

  /** Adds a file whose bytes `place` puts at the blob path it is given. */
  private async addFile(
    input: DriveAddInput,
    place: (blobPath: string) => Promise<void>
  ): Promise<DriveFile> {
    const id = randomUUID()
    const blob = this.blobPath(id)
    await mkdir(join(this.rootDir, 'blobs'), { recursive: true })
    await place(blob)
    try {
      const { size } = await stat(blob)
      return await this.mutate((index) => {
        const existing = input.originKey
          ? index.files.find((file) => file.originKey === input.originKey)
          : undefined
        if (existing) {
          void unlink(blob).catch(() => undefined)
          return publicFile(existing)
        }
        const name = sanitizeAgentSessionAttachmentName(input.name)
        const now = Date.now()
        const file: StoredFile = {
          id,
          name,
          folderId: assertDriveFolder(index, input.folderId),
          kind: driveFileKindOf(name),
          mimeType: driveMimeTypeOf(name),
          byteLength: size,
          createdAt: now,
          updatedAt: now,
          trashedAt: null,
          source: input.source,
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
          ...(input.originKey ? { originKey: input.originKey } : {})
        }
        index.files.push(file)
        return publicFile(file)
      })
    } catch (error) {
      await rm(blob, { force: true })
      throw error
    }
  }

  /** Copies a file already on this host into the Drive. */
  async addFromPath(path: string, input: DriveAddInput): Promise<DriveFile> {
    const info = await stat(path)
    if (!info.isFile()) {
      throw new Error('Only a file can go in the Drive')
    }
    if (info.size > DRIVE_FILE_MAX_BYTES) {
      throw new Error('File is too large for the Drive')
    }
    return this.addFile(input, (blob) => copyFile(path, blob))
  }

  async hasOrigin(originKey: string): Promise<boolean> {
    return (await this.load()).files.some((file) => file.originKey === originKey)
  }

  async commitUpload(uploadId: string): Promise<DriveFile> {
    const upload = await this.uploads.finish(uploadId)
    return this.addFile(upload, (blob) =>
      renameFileWithWindowsRetryAsync(upload.partPath, blob).then(() => undefined)
    )
  }

  async createFolder(
    name: string,
    parentId: string | null = null,
    workspaceId?: ForkWorkspaceId
  ): Promise<DriveFolder> {
    return this.mutate((index) => addDriveFolder(index, name, parentId, workspaceId))
  }

  /** The folder at `path` ("reports/2026"), made as needed; skips trashed folders. */
  async ensureFolderPath(path: string, workspaceId?: ForkWorkspaceId): Promise<string | null> {
    const parts = path
      .split(/[\\/]/)
      .map((part) => part.trim())
      .filter(Boolean)
    return parts.length === 0
      ? null
      : this.mutate((index) => ensureDriveFolderPath(index, parts, workspaceId))
  }

  async update(input: ForkDriveUpdateInput): Promise<{ files: number; folders: number }> {
    return this.mutate((index) => applyDriveUpdate(index, input, Date.now()))
  }

  /** Deletes for good: the files named, the folders named with all they hold, or the whole trash. */
  async delete(input: ForkDriveDeleteInput): Promise<{ files: number; folders: number }> {
    const { removedFileIds, files, folders } = await this.mutate((index) =>
      applyDriveDelete(index, input)
    )
    await Promise.all(removedFileIds.map((id) => rm(this.blobPath(id), { force: true })))
    return { files, folders }
  }
}
