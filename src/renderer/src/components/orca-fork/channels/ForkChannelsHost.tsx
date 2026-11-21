// orca-fork: mounted by the Bots section: hands its dialogs to every "New …" menu entry, holds the
// New channel dialog, and gives the list's empty space its own right-click menu.
import React, { useEffect, useRef, useState } from 'react'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { ChevronsDownUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  chatStructureEdits,
  CHANNELS_HEADER_KEY
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { registerForkSidebarDialogs } from './fork-sidebar-create'
import { ForkNewChannelDialog } from './ForkNewChannelDialog'
import { ForkChatSounds } from '../chat-sounds/ForkChatSounds'
import { ForkSidebarCreateMenuItems } from './ForkSidebarCreateMenuItems'
import { NewBotDialog } from '../../bots/NewBotDialog'
import { BotGroupMembersDialog } from '../../bots/BotGroupMembersDialog'
import { editChatStructure } from './chat-structure-store'

export function ForkChannelsHost({ onOpen }: { onOpen: () => void }): React.JSX.Element | null {
  const [open, setOpen] = useState<
    | { kind: 'channel'; categoryId: string | null }
    | { kind: 'bot' }
    | { kind: 'group'; group?: BotGroup }
    | null
  >(null)
  const opened = useRef(onOpen)
  opened.current = onOpen
  useEffect(
    () =>
      registerForkSidebarDialogs({
        newBot: () => setOpen({ kind: 'bot' }),
        editGroup: (group) => setOpen({ kind: 'group', group }),
        newChannel: (categoryId) => setOpen({ kind: 'channel', categoryId }),
        opened: () => opened.current()
      }),
    []
  )
  if (!FORK_FEATURES.chatStructure) {
    return null
  }
  const close = (): void => setOpen(null)
  return (
    <>
      <ForkSidebarSpaceMenu />
      <ForkChatSounds />
      {open?.kind === 'channel' ? (
        <ForkNewChannelDialog categoryId={open.categoryId} onClose={close} />
      ) : null}
      <NewBotDialog
        open={open?.kind === 'bot'}
        onOpenChange={(next) => !next && close()}
        onCreated={onOpen}
      />
      {open?.kind === 'group' ? <BotGroupMembersDialog group={open.group} onClose={close} /> : null}
    </>
  )
}

/** Right click between the Bots list's rows (rows and headers have their own menus): what the
 *  sidebar can create, opened at the pointer, so the list itself needs no wrapper. */
function ForkSidebarSpaceMenu(): React.JSX.Element | null {
  const t = useTranslate()
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const open = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target : null
      if (!target?.closest('[data-bot-sidebar-list]') || target.closest(ROW_SELECTOR)) {
        return
      }
      event.preventDefault()
      setAt({ x: event.clientX, y: event.clientY })
    }
    document.addEventListener('contextmenu', open)
    return () => document.removeEventListener('contextmenu', open)
  }, [])
  if (!at) {
    return null
  }
  return (
    <DropdownMenu open onOpenChange={(open) => !open && setAt(null)}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed size-0"
          style={{ left: at.x, top: at.y }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-56">
        <ForkSidebarCreateMenuItems menu="dropdown" />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            editChatStructure(chatStructureEdits.toggleCollapsed(CHANNELS_HEADER_KEY))
          }
        >
          <ChevronsDownUp className="size-3.5" />
          {t('orcaFork.chatStructure.foldChannels', 'Collapse or expand Channels')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Rows and headers that open their own menus. */
const ROW_SELECTOR =
  '[data-worktree-card-surface],[data-fork-chat-header],[data-fork-org-header],[data-slot="context-menu-trigger"],input,textarea,a[href]'
