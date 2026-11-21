// orca-fork: group photo RPCs on the groups' host.
import {
  GROUP_PHOTO_GET_METHOD,
  GROUP_PHOTO_SET_METHOD,
  GroupPhotoGet,
  GroupPhotoSet,
  type GroupPhotoGetResult
} from '../../../shared/orca-fork/group-photos/group-photo'
import { assertBotGroupOwner } from '../../runtime/rpc/methods/bot-groups'
import { defineMethod } from '../../runtime/rpc/core'
import { readGroupPhotos, writeGroupPhoto } from './group-photo-store'

export const GROUP_PHOTO_METHODS = [
  defineMethod({
    name: GROUP_PHOTO_GET_METHOD,
    permission: 'workspace',
    params: GroupPhotoGet,
    handler: async ({ groupIds }): Promise<GroupPhotoGetResult> => ({
      photos: await readGroupPhotos(groupIds)
    })
  }),
  defineMethod({
    name: GROUP_PHOTO_SET_METHOD,
    permission: 'workspace',
    params: GroupPhotoSet,
    handler: async ({ groupId, png }, context) => {
      assertBotGroupOwner(context)
      await writeGroupPhoto(groupId, png)
      return { ok: true }
    }
  })
]
