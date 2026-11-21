// orca-fork: moves a Drive file's bytes between the page and the computer that keeps it.
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import {
  DRIVE_CHUNK_BYTES,
  type DriveFile,
  type DriveReadResult,
  type DriveWorkspaceId
} from '../../../../../shared/orca-fork/drive/drive-types'
import { callDrive, driveScope, type DriveEntry } from './drive-host-data'

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, index + step))
  }
  return btoa(binary)
}

/** The whole file, read chunk by chunk; `maxBytes` stops early for a preview. */
export async function readDriveFile(
  file: DriveEntry,
  workspaceId: DriveWorkspaceId | null,
  maxBytes = Number.POSITIVE_INFINITY
): Promise<{ bytes: Uint8Array<ArrayBuffer>; truncated: boolean }> {
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  let total = file.byteLength
  while (offset < total && offset < maxBytes) {
    const read = await callDrive<DriveReadResult>(file.hostId, 'read', {
      ...driveScope(workspaceId),
      fileId: file.id,
      offset
    })
    total = read.totalBytes
    if (read.byteLength === 0) {
      break
    }
    chunks.push(base64ToBytes(read.contentBase64))
    offset += read.byteLength
  }
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.length
  }
  return { bytes, truncated: offset < total }
}

export async function downloadDriveFile(
  file: DriveEntry,
  workspaceId: DriveWorkspaceId | null
): Promise<void> {
  const { bytes } = await readDriveFile(file, workspaceId)
  const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }))
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.rel = 'noopener'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}

export async function uploadDriveFile(
  hostId: ExecutionHostId,
  workspaceId: DriveWorkspaceId | null,
  file: File,
  folderId: string | null
): Promise<DriveFile> {
  const { uploadId } = await callDrive<{ uploadId: string }>(hostId, 'uploadStart', {
    ...driveScope(workspaceId),
    name: file.name,
    byteLength: file.size,
    folderId
  })
  try {
    let offset = 0
    do {
      const slice = new Uint8Array(
        await file.slice(offset, offset + DRIVE_CHUNK_BYTES).arrayBuffer()
      )
      await callDrive(hostId, 'uploadAppend', {
        uploadId,
        offset,
        contentBase64: bytesToBase64(slice)
      })
      offset += slice.length
      if (slice.length === 0) {
        break
      }
    } while (offset < file.size)
    return await callDrive<DriveFile>(hostId, 'uploadCommit', { uploadId })
  } catch (error) {
    await callDrive(hostId, 'uploadAbort', { uploadId }).catch(() => undefined)
    throw error
  }
}
