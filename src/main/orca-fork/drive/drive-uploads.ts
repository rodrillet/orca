// orca-fork: Drive uploads in flight: chunks append to a part file, which the store renames into
// a blob on commit. An upload left alone for an hour is dropped.
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DriveFileSource } from '../../../shared/orca-fork/drive/drive-types'
import type { ForkWorkspaceId } from '../../../shared/orca-fork/workspaces/fork-workspace'

const UPLOAD_TTL_MS = 60 * 60 * 1000

export type PendingUpload = {
  workspaceId?: ForkWorkspaceId
  name: string
  folderId: string | null
  source: DriveFileSource
  expected: number
  received: number
  partPath: string
  startedAt: number
  writing: boolean
}

export class DriveUploads {
  private readonly pending = new Map<string, PendingUpload>()

  constructor(private readonly dir: string) {}

  async start(input: {
    workspaceId?: ForkWorkspaceId
    name: string
    byteLength: number
    folderId?: string | null
    source?: DriveFileSource
  }): Promise<{ uploadId: string }> {
    this.expire()
    const uploadId = randomUUID()
    await mkdir(this.dir, { recursive: true })
    const partPath = join(this.dir, `${uploadId}.part`)
    await writeFile(partPath, '')
    this.pending.set(uploadId, {
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      name: input.name,
      folderId: input.folderId ?? null,
      source: input.source ?? { kind: 'upload' },
      expected: input.byteLength,
      received: 0,
      partPath,
      startedAt: Date.now(),
      writing: false
    })
    return { uploadId }
  }

  private require(uploadId: string): PendingUpload {
    const upload = this.pending.get(uploadId)
    if (!upload) {
      throw new Error('Upload is gone; start it again')
    }
    return upload
  }

  async append(input: {
    uploadId: string
    offset: number
    contentBase64: string
  }): Promise<{ received: number }> {
    const upload = this.require(input.uploadId)
    if (upload.writing || input.offset !== upload.received) {
      throw new Error('Upload chunk is out of order')
    }
    const bytes = Buffer.from(input.contentBase64, 'base64')
    if (upload.received + bytes.length > upload.expected) {
      throw new Error('Upload is larger than announced')
    }
    upload.writing = true
    try {
      await writeFile(upload.partPath, bytes, { flag: 'a' })
      upload.received += bytes.length
    } finally {
      upload.writing = false
    }
    return { received: upload.received }
  }

  /** The complete upload, no longer pending; its part file is the caller's to move. */
  async finish(uploadId: string): Promise<PendingUpload> {
    const upload = this.require(uploadId)
    if (upload.writing) {
      throw new Error('Upload chunk is still being written')
    }
    this.pending.delete(uploadId)
    if (upload.received !== upload.expected) {
      await rm(upload.partPath, { force: true })
      throw new Error('Upload is incomplete')
    }
    return upload
  }

  async abort(uploadId: string): Promise<void> {
    const upload = this.pending.get(uploadId)
    this.pending.delete(uploadId)
    if (upload) {
      await rm(upload.partPath, { force: true })
    }
  }

  private expire(): void {
    const now = Date.now()
    for (const [id, upload] of this.pending) {
      if (now - upload.startedAt > UPLOAD_TTL_MS && !upload.writing) {
        this.pending.delete(id)
        void rm(upload.partPath, { force: true })
      }
    }
  }
}
