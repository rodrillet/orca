// orca-fork: the "New …" entries every sidebar menu shares, as agentes.chat's sidebar menus.
import React from 'react'
import { Bot, FolderTree, Hash, Layers, Users } from 'lucide-react'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { forkSidebarCreate, type ForkSidebarCreateKind } from './fork-sidebar-create'

const ICONS: Record<ForkSidebarCreateKind, React.ComponentType<{ className?: string }>> = {
  channel: Hash,
  category: Layers,
  group: Users,
  department: FolderTree,
  bot: Bot
}

const ALL_KINDS: readonly ForkSidebarCreateKind[] = [
  'channel',
  'category',
  'group',
  'department',
  'bot'
]

export function ForkSidebarCreateMenuItems({
  menu,
  kinds = ALL_KINDS,
  categoryId = null
}: {
  menu: 'context' | 'dropdown'
  kinds?: readonly ForkSidebarCreateKind[]
  /** A new channel lands in this category. */
  categoryId?: string | null
}): React.JSX.Element | null {
  const t = useTranslate()
  if (!FORK_FEATURES.chatStructure) {
    return null
  }
  const labels: Record<ForkSidebarCreateKind, string> = {
    channel: categoryId
      ? t('orcaFork.chatStructure.newChannelHere', 'New channel here')
      : t('orcaFork.chatStructure.newChannel', 'New channel…'),
    category: t('orcaFork.chatStructure.newCategory', 'New category'),
    group: t('orcaFork.chatStructure.newGroup', 'New group…'),
    department: t('orcaFork.chatStructure.newDepartment', 'New department'),
    bot: t('orcaFork.chatStructure.newBot', 'New bot…')
  }
  const Item = menu === 'context' ? ContextMenuItem : DropdownMenuItem
  return (
    <>
      {kinds.map((kind) => {
        const Icon = ICONS[kind]
        return (
          <Item key={kind} onSelect={() => forkSidebarCreate(kind, { categoryId })}>
            <Icon className="size-3.5" />
            {labels[kind]}
          </Item>
        )
      })}
    </>
  )
}
