// orca-fork: this host's one Drive store, under the profile's userData.
import { join } from 'node:path'
import { getProfileUserDataPath } from '../../orca-profiles/profile-storage-paths'
import { DriveStore } from './drive-store'

let store: DriveStore | null = null

export function getDriveStore(): DriveStore {
  if (!store) {
    store = new DriveStore(join(getProfileUserDataPath(), 'orca-fork', 'drive'))
  }
  return store
}
