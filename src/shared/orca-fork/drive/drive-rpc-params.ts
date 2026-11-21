// orca-fork: params of the `orcaFork.drive.*` methods a host serves.
import { z } from 'zod'
import { isValidBase64 } from '../../rpc-contract/clipboard/clipboard-params'
import { DRIVE_CHUNK_BASE64_CHARS, DRIVE_FILE_MAX_BYTES } from './drive-types'

const Id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[\w-]+$/, 'Invalid id')
// Fork workspace ids, as src/shared/orca-fork/workspaces/ writes them (`host:local`, `ws_…`).
const WorkspaceId = z
  .string()
  .regex(/^[\w:%.@|-]{1,160}$/, 'Invalid workspace id')
  .optional()
const Name = z.string().trim().min(1).max(255)
const Ids = z.array(Id).max(1000)

export const ForkDriveListParams = z.object({ workspaceId: WorkspaceId }).strict()

export const ForkDriveReadParams = z
  .object({
    workspaceId: WorkspaceId,
    fileId: Id,
    offset: z.number().int().nonnegative().optional()
  })
  .strict()

export const ForkDriveUploadStartParams = z
  .object({
    workspaceId: WorkspaceId,
    name: Name,
    byteLength: z.number().int().nonnegative().max(DRIVE_FILE_MAX_BYTES, 'File is too large'),
    folderId: Id.nullable().optional(),
    /** A folder path ("reports/2026"), made as needed; `orca files save --folder`. */
    folderPath: z.string().trim().min(1).max(1024).optional(),
    /** `orca files save` from an agent: what the file is, and the chat or bot it came from. */
    note: z.string().max(2000).optional(),
    botId: Id.optional(),
    callerSessionId: z.string().min(1).max(256).optional()
  })
  .strict()

export const ForkDriveUploadAppendParams = z
  .object({
    uploadId: Id,
    offset: z.number().int().nonnegative(),
    contentBase64: z
      .string()
      .max(DRIVE_CHUNK_BASE64_CHARS, 'Chunk is too large')
      .refine(isValidBase64, 'Chunk must be base64')
  })
  .strict()

export const ForkDriveUploadIdParams = z.object({ uploadId: Id }).strict()

export const ForkDriveUpdateParams = z
  .object({
    workspaceId: WorkspaceId,
    fileIds: Ids.optional(),
    folderIds: Ids.optional(),
    name: Name.optional(),
    /** Move target; null is the top level. */
    moveTo: Id.nullable().optional(),
    trashed: z.boolean().optional()
  })
  .strict()

export const ForkDriveDeleteParams = z
  .object({
    workspaceId: WorkspaceId,
    fileIds: Ids.optional(),
    folderIds: Ids.optional(),
    /** Every trashed file and folder. */
    emptyTrash: z.boolean().optional()
  })
  .strict()

export const ForkDriveFolderCreateParams = z
  .object({
    workspaceId: WorkspaceId,
    name: Name,
    parentId: Id.nullable().optional()
  })
  .strict()

export type ForkDriveUpdateInput = z.infer<typeof ForkDriveUpdateParams>
export type ForkDriveDeleteInput = z.infer<typeof ForkDriveDeleteParams>
