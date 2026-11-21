// orca-fork: the group photos this window has read, fetched in one batch per tick from the local host.
import { useEffect, useSyncExternalStore } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import {
  GROUP_PHOTO_GET_METHOD,
  GROUP_PHOTO_SET_METHOD,
  type GroupPhotoGetResult
} from '../../../../../shared/orca-fork/group-photos/group-photo'

const LOCAL = { kind: 'local' } as const
/** groupId → data URL, or null once read and found empty. */
const photos = new Map<string, string | null>()
const listeners = new Set<() => void>()
let pending: Set<string> | null = null

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function request(groupId: string): void {
  if (photos.has(groupId) || pending?.has(groupId)) {
    return
  }
  if (!pending) {
    pending = new Set()
    queueMicrotask(flush)
  }
  pending.add(groupId)
}

function flush(): void {
  const ids = [...(pending ?? [])]
  pending = null
  for (const id of ids) {
    photos.set(id, null)
  }
  // A stock host has no photos: every group keeps its faces.
  callRuntimeRpc<GroupPhotoGetResult>(LOCAL, GROUP_PHOTO_GET_METHOD, { groupIds: ids })
    .then(({ photos: found }) => {
      for (const [id, url] of Object.entries(found)) {
        photos.set(id, url)
      }
      emit()
    })
    .catch(() => undefined)
}

export function useGroupPhoto(groupId: string | null): string | null {
  const read = (): string | null => (groupId ? (photos.get(groupId) ?? null) : null)
  useEffect(() => {
    if (groupId) {
      request(groupId)
    }
  }, [groupId])
  return useSyncExternalStore(subscribe, read, read)
}

export async function setGroupPhoto(groupId: string, png: string | null): Promise<void> {
  await callRuntimeRpc(LOCAL, GROUP_PHOTO_SET_METHOD, { groupId, png })
  photos.set(groupId, png === null ? null : `data:image/png;base64,${png}`)
  emit()
}
