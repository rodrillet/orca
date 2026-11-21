// orca-fork: file and folder paths in chat messages (file links and `/abs/path` in backticks) draw
// as badges; every other link, code span and span renders as before.
import React, { type ComponentPropsWithoutRef } from 'react'
import type { ExtraProps } from 'react-markdown'
import type { CommentMarkdownExtension } from '@/components/comment-markdown/CommentMarkdown'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { routeNativeChatHref } from '../../../../../shared/native-chat/file-access/native-chat-href-routing'
import { readChatPath } from '../../../../../shared/orca-fork/chat-paths/chat-path-badges'
import { ForkChatPathBadge } from './ForkChatPathBadge'

const PATH_PROPERTY = 'dataOrcaForkPath'

type MarkdownNode = {
  type: string
  value?: string
  url?: string
  data?: { hName?: string; hProperties?: Record<string, string> }
  children?: MarkdownNode[]
}

function badge(path: string, text: string): MarkdownNode {
  return {
    type: 'text',
    value: text,
    data: { hName: 'span', hProperties: { [PATH_PROPERTY]: path } }
  }
}

function plainText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(plainText).join('') ?? ''
}

function markPaths(node: MarkdownNode): void {
  if (!node.children || node.type === 'code' || node.type === 'math') {
    return
  }
  node.children = node.children.map((child) => {
    if (child.type === 'inlineCode' && child.value) {
      return readChatPath(child.value) ? badge(child.value.trim(), child.value) : child
    }
    if (child.type === 'link') {
      const route = routeNativeChatHref(child.url)
      // A file link whose text is its path (or a name) becomes the badge; prose links keep their words.
      if (route.kind === 'file' && readChatPath(route.pathText)) {
        const location = route.line ? `${route.pathText}:${route.line}` : route.pathText
        return badge(location, plainText(child))
      }
      return child
    }
    markPaths(child)
    return child
  })
}

type SpanProps = ComponentPropsWithoutRef<'span'> & ExtraProps & { 'data-orca-fork-path'?: string }

/** Adds path badges to a chat's markdown; the extension's own span draws every other span. */
export function withForkChatPaths(extension: CommentMarkdownExtension): CommentMarkdownExtension {
  if (!FORK_FEATURES.chatPathBadges) {
    return extension
  }
  const Fallback = extension.components?.span
  const Span = ({ 'data-orca-fork-path': path, ...props }: SpanProps): React.JSX.Element => {
    const chatPath = path ? readChatPath(path) : null
    if (chatPath) {
      return <ForkChatPathBadge chatPath={chatPath} />
    }
    return !Fallback || typeof Fallback === 'string' ? <span {...props} /> : <Fallback {...props} />
  }
  return {
    ...extension,
    remarkPlugins: [...extension.remarkPlugins, () => (tree: MarkdownNode) => markPaths(tree)],
    sanitizeAttributes: {
      ...extension.sanitizeAttributes,
      span: [...(extension.sanitizeAttributes?.span ?? []), PATH_PROPERTY]
    },
    components: { ...extension.components, span: Span }
  }
}
