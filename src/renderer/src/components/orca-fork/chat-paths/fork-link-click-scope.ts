// orca-fork: the chat a link handler belongs to (its workspace, and so its machine), so a path
// badge knows where its path lives and opens it the way the chat's own file links do.
import type { CommentMarkdownLinkClickHandler } from '@/components/comment-markdown/comment-markdown-element-renderers'
import type { NativeChatFileLinkContext } from '@/components/native-chat/links/actions/native-chat-file-link-context'

const scopes = new WeakMap<CommentMarkdownLinkClickHandler, NativeChatFileLinkContext>()

/** Tags a chat's link handler with its chat's file-link context; returns the handler. */
export function tagForkLinkClickScope<H extends CommentMarkdownLinkClickHandler | undefined>(
  handler: H,
  scope: NativeChatFileLinkContext | null
): H {
  if (handler && scope) {
    scopes.set(handler, scope)
  }
  return handler
}

export function forkLinkClickScope(
  handler: CommentMarkdownLinkClickHandler
): NativeChatFileLinkContext | null {
  return scopes.get(handler) ?? null
}
