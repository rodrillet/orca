// orca-fork: the Drive over RPC, served by this app's own runtime and by a paired fork orca-server.
// A stock server answers method_not_found, which the page shows as "needs the fork's server".
import {
  ForkDriveDeleteParams,
  ForkDriveFolderCreateParams,
  ForkDriveListParams,
  ForkDriveReadParams,
  ForkDriveUpdateParams,
  ForkDriveUploadAppendParams,
  ForkDriveUploadIdParams,
  ForkDriveUploadStartParams
} from '../../../../../shared/orca-fork/drive/drive-rpc-params'
import type { DriveFileSource } from '../../../../../shared/orca-fork/drive/drive-types'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { botOfSession } from '../../../../bots/bot-session-tabs'
import { getDriveStore } from '../../../../orca-fork/drive/drive-store-registry'
import { defineMethod, InvalidArgumentError, type RpcContext } from '../../core'

function store(): ReturnType<typeof getDriveStore> {
  if (!FORK_FEATURES.drive) {
    throw new InvalidArgumentError('The Drive is off in this build.')
  }
  return getDriveStore()
}

function botOfChat(
  context: RpcContext,
  sessionId: string
): { botId: string; botName: string } | null {
  try {
    const bot = botOfSession(context.runtime.bots, sessionId)
    return bot ? { botId: bot.id, botName: bot.name } : null
  } catch {
    return null
  }
}

/** An agent's save names its chat; a session id names a chat only on its own host. */
function uploadSource(
  params: { note?: string; botId?: string; callerSessionId?: string },
  context: RpcContext
): DriveFileSource {
  const sessionId = context.pairedDeviceId === undefined ? params.callerSessionId : undefined
  if (!sessionId && !params.botId) {
    return { kind: 'upload' }
  }
  const chatBot = sessionId ? botOfChat(context, sessionId) : null
  let named: { botId: string; botName: string } | null = null
  if (params.botId) {
    try {
      const bot = context.runtime.bots.list().find((entry) => entry.id === params.botId)
      named = bot ? { botId: bot.id, botName: bot.name } : null
    } catch {
      named = null
    }
  }
  const bot = chatBot ?? named
  return {
    kind: 'agent',
    ...(sessionId ? { sessionId } : {}),
    ...(bot ? bot : {}),
    ...(params.note ? { note: params.note } : {})
  }
}

export const ORCA_FORK_DRIVE_METHODS = [
  defineMethod({
    name: 'orcaFork.drive.list',
    permission: 'workspace',
    params: ForkDriveListParams,
    handler: async (params, context) => {
      const drive = store()
      await drive.enrichSources((sessionId) => botOfChat(context, sessionId))
      const listed = await drive.list()
      // Asked for one workspace: what was put in it, and what no workspace claims (the desktop places those).
      const scoped = <T extends { workspaceId?: string }>(items: T[]): T[] =>
        params.workspaceId
          ? items.filter((item) => !item.workspaceId || item.workspaceId === params.workspaceId)
          : items
      return { files: scoped(listed.files), folders: scoped(listed.folders) }
    }
  }),
  defineMethod({
    name: 'orcaFork.drive.read',
    permission: 'workspace',
    params: ForkDriveReadParams,
    handler: async (params) => store().read(params.fileId, params.offset)
  }),
  defineMethod({
    name: 'orcaFork.drive.uploadStart',
    permission: 'workspace',
    params: ForkDriveUploadStartParams,
    handler: async (params, context) => {
      const workspaceId = params.workspaceId
      const drive = store()
      const folderId = params.folderPath
        ? await drive.ensureFolderPath(params.folderPath, workspaceId)
        : (params.folderId ?? null)
      return drive.uploads.start({
        ...(workspaceId ? { workspaceId } : {}),
        name: params.name,
        byteLength: params.byteLength,
        folderId,
        source: uploadSource(params, context)
      })
    }
  }),
  defineMethod({
    name: 'orcaFork.drive.uploadAppend',
    permission: 'workspace',
    params: ForkDriveUploadAppendParams,
    handler: async (params) => store().uploads.append(params)
  }),
  defineMethod({
    name: 'orcaFork.drive.uploadCommit',
    permission: 'workspace',
    params: ForkDriveUploadIdParams,
    handler: async (params) => store().commitUpload(params.uploadId)
  }),
  defineMethod({
    name: 'orcaFork.drive.uploadAbort',
    permission: 'workspace',
    params: ForkDriveUploadIdParams,
    handler: async (params) => {
      await store().uploads.abort(params.uploadId)
      return { aborted: true }
    }
  }),
  defineMethod({
    name: 'orcaFork.drive.update',
    permission: 'workspace',
    params: ForkDriveUpdateParams,
    handler: async (params) => store().update(params)
  }),
  defineMethod({
    name: 'orcaFork.drive.delete',
    permission: 'workspace',
    params: ForkDriveDeleteParams,
    handler: async (params) => store().delete(params)
  }),
  defineMethod({
    name: 'orcaFork.drive.folderCreate',
    permission: 'workspace',
    params: ForkDriveFolderCreateParams,
    handler: async (params) =>
      store().createFolder(params.name, params.parentId ?? null, params.workspaceId)
  })
]
