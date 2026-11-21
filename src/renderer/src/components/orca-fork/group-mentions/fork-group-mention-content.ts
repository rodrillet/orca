// orca-fork: group tokens in composer text become group pills, as bot tokens become bot pills.
import type { JSONContent } from '@tiptap/react'
import {
  groupMentionToken,
  splitGroupMentions
} from '../../../../../shared/orca-fork/group-mentions/group-mentions'

export const FORK_GROUP_MENTION_NODE = 'orcaForkGroupMention'

/** `text` as text nodes and group pills. */
export function forkGroupMentionContent(text: string): JSONContent[] {
  return splitGroupMentions(text).map((part) =>
    typeof part === 'string'
      ? { type: 'text', text: part }
      : { type: FORK_GROUP_MENTION_NODE, attrs: { id: part.id, name: part.name } }
  )
}

/** A group pill's text, or null for any other node. */
export function forkGroupMentionLeafString(
  type: string | undefined,
  attrs: Readonly<Record<string, unknown>> | undefined
): string | null {
  return type === FORK_GROUP_MENTION_NODE
    ? groupMentionToken({ id: String(attrs?.id), name: String(attrs?.name) })
    : null
}
