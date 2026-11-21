// orca-fork: the owner's own profile (name, photo, status), shown in the rail and workspace members.
// Kept in this window's storage: Orca has one owner and no account profile to sync it with.
import { createForkDocumentStore } from '../fork-document-store'

export const OWNER_PRESENCES = ['available', 'busy', 'away'] as const
export type OwnerPresence = (typeof OWNER_PRESENCES)[number]

export type OwnerProfile = {
  revision: number
  name: string
  /** Square `data:image/png` picture, or null for the initials. */
  photo: string | null
  presence: OwnerPresence
  /** A short custom status ("Em reunião até 15h"). */
  status: string
}

const PHOTO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
export const OWNER_NAME_MAX = 80
export const OWNER_STATUS_MAX = 120

function emptyOwnerProfile(): OwnerProfile {
  return { revision: 0, name: '', photo: null, presence: 'available', status: '' }
}

function normalizeOwnerProfile(raw: unknown): OwnerProfile {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const presence = OWNER_PRESENCES.find((p) => p === input.presence) ?? 'available'
  return {
    revision: typeof input.revision === 'number' ? input.revision : 0,
    name: typeof input.name === 'string' ? input.name.slice(0, OWNER_NAME_MAX) : '',
    photo: typeof input.photo === 'string' && PHOTO_PATTERN.test(input.photo) ? input.photo : null,
    presence,
    status: typeof input.status === 'string' ? input.status.slice(0, OWNER_STATUS_MAX) : ''
  }
}

export const ownerProfileStore = createForkDocumentStore<OwnerProfile>({
  storageKey: 'orca-fork:owner-profile',
  empty: emptyOwnerProfile,
  normalize: normalizeOwnerProfile,
  bridge: () => undefined
})

export function saveOwnerProfile(patch: Partial<Omit<OwnerProfile, 'revision'>>): void {
  ownerProfileStore.edit((doc) => ({ ...doc, ...patch, revision: doc.revision + 1 }))
}
