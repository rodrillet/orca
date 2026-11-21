// orca-fork: every file the owner sends in a chat is copied into the Drive when the host claims it
// for the chat, so the Drive keeps it after the attachment store sweeps the upload away.
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { AGENT_SESSION_ATTACHMENTS_DIR_NAME } from '../../../shared/agent-session/agent-session-attachments'
import type { AgentJournalMessageItem } from '../../../shared/agent-session/journal/agent-session-journal-types'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import {
  AGENT_SESSION_ATTACHMENT_PART_FILE,
  agentSessionAttachmentReferences
} from '../../native-chat/agent-session-attachments/agent-session-attachment-references'
import { getDriveStore } from './drive-store-registry'
import type { DriveClaimedAttachments } from './drive-claim-hook'

const EXCERPT_MAX = 160

/** The message's words without the attachment paths it carries. */
export function chatMessageExcerpt(body: AgentJournalMessageItem): string | undefined {
  const text = body.blocks
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join(' ')
    .split(/\s+/)
    .filter((word) => !word.includes(AGENT_SESSION_ATTACHMENTS_DIR_NAME))
    .join(' ')
    .trim()
  if (!text) {
    return undefined
  }
  return text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX - 1)}…` : text
}

async function storedFileOf(root: string, uploadId: string): Promise<string | null> {
  try {
    const entries = await readdir(join(root, uploadId))
    const name = entries.find((entry) => entry !== AGENT_SESSION_ATTACHMENT_PART_FILE)
    return name ?? null
  } catch {
    return null
  }
}

/** Best effort: a failed copy never fails the chat's send. */
export async function captureChatAttachmentsInDrive(claim: DriveClaimedAttachments): Promise<void> {
  if (!FORK_FEATURES.drive) {
    return
  }
  const { attachmentRoot, sessionId, body, itemId } = claim
  try {
    const uploadIds = agentSessionAttachmentReferences(attachmentRoot, body)
    if (uploadIds.size === 0) {
      return
    }
    const store = getDriveStore()
    const excerpt = chatMessageExcerpt(body)
    for (const uploadId of uploadIds) {
      const originKey = `chat-attachment:${uploadId}`
      // The send claims before the message is written; the write names its item.
      if (await store.hasOrigin(originKey)) {
        if (itemId) {
          await store.linkOriginToMessage(originKey, itemId)
        }
        continue
      }
      const name = await storedFileOf(attachmentRoot, uploadId)
      if (!name) {
        continue
      }
      await store.addFromPath(join(attachmentRoot, uploadId, name), {
        name,
        originKey,
        source: {
          kind: 'chat-attachment',
          sessionId,
          ...(excerpt ? { excerpt } : {}),
          ...(itemId ? { messageId: itemId } : {})
        }
      })
    }
  } catch (error) {
    console.warn('[orca-fork drive] could not keep a chat attachment', error)
  }
}
