// orca-fork: every chat attachment a host claims passes here, inside the journal's transaction; the
// runtime installs a listener that copies it into the Drive once the transaction is done.
import type { AgentJournalMessageItem } from '../../../shared/agent-session/journal/agent-session-journal-types'

export type DriveClaimedAttachments = {
  attachmentRoot: string
  sessionId: string
  body: AgentJournalMessageItem
  /** The journal item the message is, when the claim knows it. */
  itemId?: string
}

let listener: ((claim: DriveClaimedAttachments) => void) | null = null

export function setDriveClaimListener(
  next: ((claim: DriveClaimedAttachments) => void) | null
): void {
  listener = next
}

/** Never throws: the claim's transaction must not fail for the Drive. */
export function notifyDriveOfClaim(claim: DriveClaimedAttachments): void {
  try {
    listener?.(claim)
  } catch {
    // Best effort.
  }
}
