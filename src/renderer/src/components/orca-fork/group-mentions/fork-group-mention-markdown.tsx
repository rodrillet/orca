// orca-fork: `#group` in chat messages draws as a chip that opens the group; other `#words` stay text.
import React, { type ComponentPropsWithoutRef } from 'react'
import { toast } from 'sonner'
import type { ExtraProps } from 'react-markdown'
import type { CommentMarkdownExtension } from '@/components/comment-markdown/CommentMarkdown'
import { useBotGroups } from '@/lib/bot-group-list'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  groupSlug,
  splitGroupRefs
} from '../../../../../shared/orca-fork/group-mentions/group-mentions'
import { botErrorMessage } from '../../bots/bot-presentation'
import { ForkGroupGlyph } from './use-fork-group-mentions'

const GROUP_PROPERTY = 'dataOrcaForkGroup'
const SKIPPED = new Set([
  'code',
  'inlineCode',
  'link',
  'linkReference',
  'html',
  'math',
  'inlineMath'
])

type MarkdownNode = {
  type: string
  value?: string
  data?: { hName?: string; hProperties?: Record<string, string> }
  children?: MarkdownNode[]
}

function splitRefs(node: MarkdownNode): void {
  if (SKIPPED.has(node.type) || !node.children) {
    return
  }
  node.children = node.children.flatMap((child): MarkdownNode[] => {
    if (child.type === 'text' && child.value?.includes('#') && !child.data) {
      return splitGroupRefs(child.value).map((part) =>
        part.slug
          ? {
              type: 'text',
              value: part.text,
              data: { hName: 'span', hProperties: { [GROUP_PROPERTY]: part.slug } }
            }
          : { type: 'text', value: part.text }
      )
    }
    splitRefs(child)
    return [child]
  })
}

type SpanProps = ComponentPropsWithoutRef<'span'> & ExtraProps

function GroupChip({
  slug,
  children
}: {
  slug: string
  children: React.ReactNode
}): React.JSX.Element {
  const group = useBotGroups().find((g) => groupSlug(g.name) === slug) ?? null
  if (!group) {
    return <>{children}</>
  }
  return (
    <button
      type="button"
      title={group.name}
      onClick={() =>
        void openBotGroup(group).catch((e: unknown) => toast.error(botErrorMessage(e)))
      }
      className="inline-flex items-center gap-1 rounded-sm bg-accent px-1 align-baseline font-medium text-foreground hover:bg-accent/70"
    >
      <ForkGroupGlyph group={group} />#{group.name}
    </button>
  )
}

/** Adds `#group` chips to a chat's markdown; the extension's own span draws every other span. */
export function withForkGroupMentions(
  extension: CommentMarkdownExtension
): CommentMarkdownExtension {
  if (!FORK_FEATURES.groupMentions) {
    return extension
  }
  const Fallback = extension.components?.span
  const Span = ({
    'data-orca-fork-group': slug,
    ...props
  }: SpanProps & { 'data-orca-fork-group'?: string }): React.JSX.Element => {
    if (slug) {
      return <GroupChip slug={slug}>{props.children}</GroupChip>
    }
    return !Fallback || typeof Fallback === 'string' ? <span {...props} /> : <Fallback {...props} />
  }
  return {
    ...extension,
    remarkPlugins: [...extension.remarkPlugins, () => (tree: MarkdownNode) => splitRefs(tree)],
    sanitizeAttributes: {
      ...extension.sanitizeAttributes,
      span: [...(extension.sanitizeAttributes?.span ?? []), GROUP_PROPERTY]
    },
    components: { ...extension.components, span: Span }
  }
}
