// orca-fork: a just-created department or section opens its header in rename mode once.
import { createNonSecureContextUuid } from '../../../../../shared/identifiers/non-secure-context-uuid'

let pendingRenameHeaderId: string | null = null

export function requestHeaderRename(headerId: string): void {
  pendingRenameHeaderId = headerId
}

export function takeHeaderRename(headerId: string): boolean {
  if (pendingRenameHeaderId !== headerId) {
    return false
  }
  pendingRenameHeaderId = null
  return true
}

export function newOrganizationId(): string {
  return createNonSecureContextUuid()
}
