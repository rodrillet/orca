// orca-fork: `orca files save|list` over `orcaFork.drive.*`; a save streams the file's bytes, so it
// works the same against this computer and a paired server.
import { open, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import type { CommandHandler, HandlerContext } from '../../dispatch/dispatch'
import { getOptionalStringFlag, getRequiredStringFlag } from '../../arguments/flags'
import { printResult } from '../../output/command-result-output'
import { RuntimeClientError } from '../../runtime/connection/types'
import { callerChat } from '../../automations/automation-caller-chat'
import {
  DRIVE_CHUNK_BYTES,
  DRIVE_FILE_MAX_BYTES,
  type DriveFile,
  type DriveListResult
} from '../../../shared/orca-fork/drive/drive-types'

function formatBytes(bytes: number): string {
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

function workspaceOf(ctx: HandlerContext): Record<string, string> {
  const workspaceId = getOptionalStringFlag(ctx.flags, 'workspace')
  return workspaceId ? { workspaceId } : {}
}

async function saveFile(ctx: HandlerContext): Promise<void> {
  const { flags, client, cwd, json } = ctx
  const path = resolve(cwd, getRequiredStringFlag(flags, 'file'))
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) {
    throw new RuntimeClientError('invalid_argument', `No file at ${path}`)
  }
  if (info.size > DRIVE_FILE_MAX_BYTES) {
    throw new RuntimeClientError('invalid_argument', 'File is too large for the Drive (200 MB).')
  }
  const folderPath = getOptionalStringFlag(flags, 'folder')
  const note = getOptionalStringFlag(flags, 'note')
  const { result: started } = await client.call<{ uploadId: string }>(
    'orcaFork.drive.uploadStart',
    {
      ...workspaceOf(ctx),
      name: getOptionalStringFlag(flags, 'name') ?? basename(path),
      byteLength: info.size,
      ...(folderPath ? { folderPath } : {}),
      ...(note ? { note } : {}),
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
  const committed = await client.call<DriveFile>('orcaFork.drive.uploadCommit', {
    uploadId: started.uploadId
  })
  printResult(
    committed,
    json,
    (file) => `Saved ${file.name} (${formatBytes(file.byteLength)}) in the Drive.`
  )
}

function formatList(result: DriveListResult): string {
  const folders = new Map(result.folders.map((folder) => [folder.id, folder]))
  const pathOf = (folderId: string | null): string => {
    const parts: string[] = []
    for (let at = folderId ? folders.get(folderId) : undefined; at;) {
      parts.unshift(at.name)
      at = at.parentId ? folders.get(at.parentId) : undefined
    }
    return parts.length > 0 ? `${parts.join('/')}/` : ''
  }
  const files = result.files.filter((file) => file.trashedAt === null)
  if (files.length === 0) {
    return 'The Drive is empty.'
  }
  return files
    .toSorted((a, b) => b.updatedAt - a.updatedAt)
    .map((file) => {
      const from = file.source.kind === 'upload' ? '' : file.source.botName
      return `${pathOf(file.folderId)}${file.name}  ${formatBytes(file.byteLength)}${from ? `  from ${from}` : ''}`
    })
    .join('\n')
}

export const DRIVE_HANDLERS: Record<string, CommandHandler> = {
  'files save': saveFile,
  'files list': async (ctx) => {
    const result = await ctx.client.call<DriveListResult>('orcaFork.drive.list', workspaceOf(ctx))
    printResult(result, ctx.json, formatList)
  }
}
