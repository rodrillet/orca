// orca-fork: streams a local file into the Drive of the computer the CLI talks to, linked to the
// chat it runs from.
import { open, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { RuntimeRpcSuccess } from '../../../shared/remote-runtime/rpc/runtime-rpc-envelope'
import type { HandlerContext } from '../../dispatch/dispatch'
import { RuntimeClientError } from '../../runtime/connection/types'
import { callerChat } from '../../automations/automation-caller-chat'
import {
  DRIVE_CHUNK_BYTES,
  DRIVE_FILE_MAX_BYTES,
  type DriveFile
} from '../../../shared/orca-fork/drive/drive-types'

export type DriveSaveOptions = {
  workspaceId?: string
  name?: string
  folderPath?: string
  note?: string
}

export async function saveLocalFileInDrive(
  client: HandlerContext['client'],
  path: string,
  options: DriveSaveOptions = {}
): Promise<RuntimeRpcSuccess<DriveFile>> {
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) {
    throw new RuntimeClientError('invalid_argument', `No file at ${path}`)
  }
  if (info.size > DRIVE_FILE_MAX_BYTES) {
    throw new RuntimeClientError('invalid_argument', 'File is too large for the Drive (200 MB).')
  }
  const { result: started } = await client.call<{ uploadId: string }>(
    'orcaFork.drive.uploadStart',
    {
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
      name: options.name ?? basename(path),
      byteLength: info.size,
      ...(options.folderPath ? { folderPath: options.folderPath } : {}),
      ...(options.note ? { note: options.note } : {}),
      ...callerChat()
    }
  )
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(DRIVE_CHUNK_BYTES)
    let offset = 0
    do {
      const { bytesRead } = await handle.read(buffer, 0, DRIVE_CHUNK_BYTES, offset)
      await client.call('orcaFork.drive.uploadAppend', {
        uploadId: started.uploadId,
        offset,
        contentBase64: buffer.subarray(0, bytesRead).toString('base64')
      })
      offset += bytesRead
      if (bytesRead === 0) {
        break
      }
    } while (offset < info.size)
  } catch (error) {
    await client
      .call('orcaFork.drive.uploadAbort', { uploadId: started.uploadId })
      .catch(() => undefined)
    throw error
  } finally {
    await handle.close()
  }
  return client.call<DriveFile>('orcaFork.drive.uploadCommit', { uploadId: started.uploadId })
}

/** `orca bot reply --file`: what a bot attaches also lands in the Drive; never fails the reply. */
export async function keepRepliedFilesInDrive(
  client: HandlerContext['client'],
  paths: readonly string[],
  note: string | undefined
): Promise<void> {
  for (const path of paths) {
    await saveLocalFileInDrive(client, path, note ? { note: note.slice(0, 2000) } : {}).catch(
      () => undefined
    )
  }
}
