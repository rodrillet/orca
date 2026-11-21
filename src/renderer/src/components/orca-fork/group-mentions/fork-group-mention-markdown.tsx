// orca-fork: `#group` in chat messages draws as a chip that opens the group; other `#words` stay text.
import React, { type ComponentPropsWithoutRef } from 'react'
import { toast } from 'sonner'
import type { ExtraProps } from 'react-markdown'
import type { CommentMarkdownExtension } from '@/components/comment-markdown/CommentMarkdown'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { useForkBotGroups } from './use-fork-bot-groups'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  GROUP_MENTION_PREFIX,
  groupSlug,
  splitGroupRefs
} from '../../../../../shared/orca-fork/group-mentions/group-mentions'
import { botErrorMessage } from '../../bots/bot-presentation'
import { ForkGroupGlyph } from './use-fork-group-mentions'

const GROUP_PROPERTY = 'dataOrcaForkGroup'
const GROUP_ID_PROPERTY = 'dataOrcaForkGroupId'
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
  url?: string
  data?: { hName?: string; hProperties?: Record<string, string> }
  children?: MarkdownNode[]
}

function plainText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(plainText).join('') ?? ''
}

function splitRefs(node: MarkdownNode): void {
  if (SKIPPED.has(node.type) || !node.children) {
    return
  }
  node.children = node.children.flatMap((child): MarkdownNode[] => {
    // A picked group's `[#name](bot-group:<id>)`: bound to the group, its written name the fallback.
    if (child.type === 'link' && child.url?.startsWith(GROUP_MENTION_PREFIX)) {
      return [
        {
          type: 'text',
          value: `#${plainText(child).replace(/^#/u, '')}`,
          data: {
            hName: 'span',
            hProperties: { [GROUP_ID_PROPERTY]: child.url.slice(GROUP_MENTION_PREFIX.length) }
          }
        }
      ]
    }
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
  id,
  children
}: {
  slug?: string
  id?: string
  children: React.ReactNode
}): React.JSX.Element {
  // A picked group by its id (renames keep the link); a typed `#name` by the name it has now.
  const group =
    useForkBotGroups().find((g) => (id ? g.id === id : groupSlug(g.name) === slug)) ?? null
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
    'data-orca-fork-group-id': id,
    ...props
  }: SpanProps & {
    'data-orca-fork-group'?: string
    'data-orca-fork-group-id'?: string
  }): React.JSX.Element => {
    if (slug || id) {
      return (
        <GroupChip slug={slug} id={id}>
          {props.children}
        </GroupChip>
      )
    }
    return !Fallback || typeof Fallback === 'string' ? <span {...props} /> : <Fallback {...props} />
  }
  return {
    ...extension,
    remarkPlugins: [...extension.remarkPlugins, () => (tree: MarkdownNode) => splitRefs(tree)],
    sanitizeAttributes: {
      ...extension.sanitizeAttributes,
      span: [...(extension.sanitizeAttributes?.span ?? []), GROUP_PROPERTY, GROUP_ID_PROPERTY]
    },
    components: { ...extension.components, span: Span }
  }
}
