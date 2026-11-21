// orca-fork: a bot group row's channel entries (turn into a channel, move to a category, mute) and
// the "New" submenu every bot and group row carries.
import React from 'react'
import { Bell, BellOff, FolderInput, Hash, Layers, Plus, Undo2 } from 'lucide-react'
import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  chatStructureEdits,
  workspaceCategories
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { useActiveForkWorkspaceId } from '../workspaces/fork-workspaces-store'
import { editChatStructure, useChatStructure } from './chat-structure-store'
import { createChatCategory } from './fork-sidebar-create'
import { ForkSidebarCreateMenuItems } from './ForkSidebarCreateMenuItems'

const NO_CATEGORY = ''

export function ForkChannelMenuItems({ entryKey }: { entryKey: string }): React.JSX.Element | null {
  const t = useTranslate()
  const doc = useChatStructure()
  const workspaceId = useActiveForkWorkspaceId()
  if (!FORK_FEATURES.chatStructure) {
    return null
  }
  const channel = doc.channels[entryKey]
  if (!channel) {
    return (
      <ContextMenuItem
        onSelect={() => editChatStructure(chatStructureEdits.placeChannel(entryKey, null))}
      >
        <Hash className="size-3.5" />
        {t('orcaFork.chatStructure.makeChannel', 'Turn into channel')}
      </ContextMenuItem>
    )
  }
  const categories = workspaceCategories(doc, FORK_FEATURES.workspaces ? workspaceId : null)
  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <FolderInput className="size-3.5" />
          {t('orcaFork.chatStructure.moveToCategory', 'Move to category')}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-52">
          <ContextMenuRadioGroup
            value={channel.categoryId ?? NO_CATEGORY}
            onValueChange={(value) =>
              editChatStructure(chatStructureEdits.placeChannel(entryKey, value || null))
            }
          >
            <ContextMenuRadioItem value={NO_CATEGORY}>
              {t('orcaFork.chatStructure.noCategory', 'No category')}
            </ContextMenuRadioItem>
            {categories.map((category) => (
              <ContextMenuRadioItem key={category.id} value={category.id}>
                {category.name}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => createChatCategory(entryKey)}>
            <Layers className="size-3.5" />
            {t('orcaFork.chatStructure.newCategoryWith', 'New category with this channel')}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onSelect={() => editChatStructure(chatStructureEdits.setMuted(entryKey, !channel.muted))}
      >
        {channel.muted ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
        {channel.muted
          ? t('orcaFork.chatStructure.unmute', 'Unmute channel')
          : t('orcaFork.chatStructure.mute', 'Mute channel')}
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => editChatStructure(chatStructureEdits.unmarkChannel(entryKey))}
      >
        <Undo2 className="size-3.5" />
        {t('orcaFork.chatStructure.makeGroup', 'Turn back into a group')}
      </ContextMenuItem>
    </>
  )
}

/** "New ▸ channel, category, group, department, bot" in a row's right-click menu. */
export function ForkSidebarNewSubmenu(): React.JSX.Element | null {
  const t = useTranslate()
  if (!FORK_FEATURES.chatStructure) {
    return null
  }
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Plus className="size-3.5" />
        {t('orcaFork.chatStructure.new', 'New')}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-48">
        <ForkSidebarCreateMenuItems menu="context" />
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
