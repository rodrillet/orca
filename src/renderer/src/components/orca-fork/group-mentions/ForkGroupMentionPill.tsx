// orca-fork: a group picked under `#` in the composer: a pill with the group's current name; the text
// stays its `[#<name>](bot-group:<id>)` token, so the message is bound to the group, not its name.
import React from 'react'
import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Users } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { groupMentionToken } from '../../../../../shared/orca-fork/group-mentions/group-mentions'
import { NativeChatPromptPill } from '../../native-chat/composer/editor/NativeChatPromptPill'
import { useForkBotGroups } from './use-fork-bot-groups'
import { FORK_GROUP_MENTION_NODE } from './fork-group-mention-content'

function ForkGroupMentionPill({ node, selected }: NodeViewProps): React.JSX.Element {
  const t = useTranslate()
  const id = String(node.attrs.id)
  const group = useForkBotGroups().find((g) => g.id === id) ?? null
  // Bound by id: a renamed group shows its new name; a deleted one, the name it was picked with.
  const name = group?.name ?? String(node.attrs.name)
  return (
    <NodeViewWrapper as="span" className="inline" contentEditable={false} data-orca-fork-group={id}>
      <NativeChatPromptPill
        icon={Users}
        label={`#${name}`}
        spokenLabel={t('orcaFork.groupMentions.pillLabel', 'Mentioned group: {{name}}', { name })}
        muted={group === null}
        selected={selected}
        title={name}
      />
    </NodeViewWrapper>
  )
}

export const ForkGroupMention = Node.create({
  name: FORK_GROUP_MENTION_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addNodeView: () => ReactNodeViewRenderer(ForkGroupMentionPill),
  addAttributes: () => ({ id: { default: '' }, name: { default: '' } }),
  renderText: ({ node }) =>
    groupMentionToken({ id: String(node.attrs.id), name: String(node.attrs.name) }),
  renderHTML: ({ node }) => [
    'span',
    { 'data-orca-fork-group': node.attrs.id },
    groupMentionToken({ id: String(node.attrs.id), name: String(node.attrs.name) })
  ]
})
