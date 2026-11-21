// orca-fork: every fork addition to a chat message's markdown: #group chips, then path badges.
import type { CommentMarkdownExtension } from '@/components/comment-markdown/CommentMarkdown'
import { withForkGroupMentions } from '../group-mentions/fork-group-mention-markdown'
import { withForkChatPaths } from './fork-chat-path-markdown'

export function withForkChatMarkdown(
  extension: CommentMarkdownExtension
): CommentMarkdownExtension {
  return withForkChatPaths(withForkGroupMentions(extension))
}
