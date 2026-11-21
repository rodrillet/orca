// orca-fork: a bot group's own picture, kept by the group's host (groups live on the desktop).
import * as z from 'zod'

export const GROUP_PHOTO_GET_METHOD = 'orcaFork.groupPhoto.get'
export const GROUP_PHOTO_SET_METHOD = 'orcaFork.groupPhoto.set'

const GroupId = z.string().regex(/^[\w-]{1,128}$/u)

export const GroupPhotoGet = z.object({ groupIds: z.array(GroupId).max(500) }).strict()
/** `png` is the base64 PNG the bot picture intake makes (512 px square); null removes the photo. */
export const GroupPhotoSet = z
  .object({ groupId: GroupId, png: z.string().max(4_000_000).nullable() })
  .strict()

/** groupId → `data:image/png;base64,…`; a group without a photo is absent. */
export type GroupPhotoGetResult = { photos: Record<string, string> }
