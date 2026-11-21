// orca-fork: the Channels header and a category header in the Bots list: fold, rename in place,
// a + and a right-click menu, drops of channels into it and (a category) drag to reorder.
import React, { useRef, useState } from 'react'
import { ChevronRight, ChevronsDownUp, Network, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import {
  chatStructureEdits,
  workspaceCategories,
  type ChatStructureHeader
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { chatStructureStore, editChatStructure } from './chat-structure-store'
import { takeCategoryRename } from './chat-category-rename'
import {
  acceptChatDrag,
  draggingChat,
  dropCategory,
  dropChannel,
  endChatDrag,
  lowerHalf,
  startChatDrag
} from './chat-structure-drag'
import { ForkSidebarCreateMenuItems } from './ForkSidebarCreateMenuItems'
import { openAgentsMap } from '../agents-map/open-agents-map'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

type DropMark = 'into' | 'before' | 'after' | null

export function ForkChatHeaderRow({
  header,
  nextCategoryId
}: {
  header: ChatStructureHeader
  nextCategoryId: string | null
}): React.JSX.Element {
  const t = useTranslate()
  const categoryId = header.categoryId
  const [editing, setEditing] = useState(() =>
    categoryId ? takeCategoryRename(categoryId) : false
  )
  const [mark, setMark] = useState<DropMark>(null)
  const editStartedAt = useRef(0)
  const collapseKey = categoryId ?? header.id

  const commitRename = (value: string): void => {
    editStartedAt.current = 0
    setEditing(false)
    if (categoryId && value.trim() && value.trim() !== header.title) {
      editChatStructure(chatStructureEdits.renameCategory(categoryId, value))
    }
  }
  const foldAll = (): void => {
    const doc = chatStructureStore.get()
    const ids = workspaceCategories(doc, null).map((c) => c.id)
    const allClosed = ids.every((id) => doc.collapsed.includes(id))
    editChatStructure(chatStructureEdits.setCollapsed(ids, !allClosed))
  }
  const deleteCategory = (): void => {
    if (!categoryId) {
      return
    }
    const before = chatStructureStore.get()
    const category = before.categories.find((c) => c.id === categoryId)
    editChatStructure(chatStructureEdits.removeCategory(categoryId))
    toast(
      t('orcaFork.chatStructure.categoryDeleted', 'Category “{{name}}” deleted', {
        name: category?.name ?? header.title
      }),
      {
        action: {
          label: t('orcaFork.chatStructure.undo', 'Undo'),
          // Undo: the same category with the same channels, back in its place.
          onClick: () => editChatStructure((doc) => ({ ...before, revision: doc.revision + 1 }))
        }
      }
    )
  }

  const menuItems = (
    <>
      <ForkSidebarCreateMenuItems
        menu="context"
        kinds={categoryId ? ['channel'] : ['channel', 'category']}
        categoryId={categoryId}
      />
      {categoryId ? (
        <ContextMenuItem onSelect={() => setEditing(true)}>
          <Pencil className="size-3.5" />
          {t('orcaFork.chatStructure.rename', 'Rename')}
        </ContextMenuItem>
      ) : null}
      {FORK_FEATURES.agentsMap && !categoryId ? (
        <ContextMenuItem onSelect={openAgentsMap}>
          <Network className="size-3.5" />
          {t('orcaFork.agentsMap.open', 'Agents map')}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem onSelect={foldAll}>
        <ChevronsDownUp className="size-3.5" />
        {t('orcaFork.chatStructure.foldAll', 'Collapse/expand categories')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ForkSidebarCreateMenuItems
        menu="context"
        kinds={
          categoryId ? ['category', 'group', 'department', 'bot'] : ['group', 'department', 'bot']
        }
      />
      {categoryId ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={deleteCategory}>
            <Trash2 className="size-3.5" />
            {t('orcaFork.chatStructure.deleteCategory', 'Delete category')}
          </ContextMenuItem>
        </>
      ) : null}
    </>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-fork-chat-header={header.id}
          draggable={categoryId !== null && !editing}
          className={cn(
            'group/fork-chat relative flex h-7 items-center gap-1 rounded-md pr-1 text-[11px] font-semibold text-muted-foreground',
            header.level === 1 ? 'pl-3' : 'pl-1',
            mark === 'into' && 'bg-accent text-accent-foreground',
            mark === 'before' && 'shadow-[inset_0_2px_0_var(--ring)]',
            mark === 'after' && 'shadow-[inset_0_-2px_0_var(--ring)]'
          )}
          onDragStart={(event) => {
            if (categoryId) {
              startChatDrag(event, { kind: 'category', id: categoryId })
            }
          }}
          onDragEnd={() => {
            endChatDrag()
            setMark(null)
          }}
          onDragOver={(event) => {
            const kind = draggingChat()?.kind
            if (kind === 'channel' && acceptChatDrag(event, ['channel'])) {
              setMark('into')
            } else if (kind === 'category' && categoryId && acceptChatDrag(event, ['category'])) {
              setMark(lowerHalf(event) ? 'after' : 'before')
            }
          }}
          onDragLeave={() => setMark(null)}
          onDrop={(event) => {
            const at = mark
            setMark(null)
            if (draggingChat()?.kind === 'channel') {
              event.preventDefault()
              dropChannel(categoryId, null)
              if (header.collapsed) {
                editChatStructure(chatStructureEdits.toggleCollapsed(collapseKey))
              }
            } else if (categoryId && at) {
              event.preventDefault()
              dropCategory(at === 'after' ? nextCategoryId : categoryId)
            }
          }}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-expanded={!header.collapsed}
            onClick={() => editChatStructure(chatStructureEdits.toggleCollapsed(collapseKey))}
          >
            <ChevronRight
              className={cn(
                'size-3 shrink-0 transition-transform',
                !header.collapsed && 'rotate-90'
              )}
            />
            {editing ? null : (
              <span className={cn('truncate', header.level === 0 && 'uppercase tracking-wide')}>
                {header.title}
              </span>
            )}
            {editing ? null : (
              <span className="shrink-0 font-medium tabular-nums opacity-70">{header.count}</span>
            )}
          </button>
          {editing ? (
            <input
              autoFocus
              defaultValue={header.title}
              aria-label={t('orcaFork.chatStructure.rename', 'Rename')}
              className="absolute left-6 right-8 h-6 rounded-sm border border-input bg-background px-1.5 text-[12px] font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onFocus={(event) => {
                if (editStartedAt.current === 0) {
                  editStartedAt.current = Date.now()
                }
                event.currentTarget.select()
              }}
              onBlur={(event) => {
                const input = event.currentTarget
                // A closing menu hands focus back to its trigger right after the field opens.
                if (Date.now() - editStartedAt.current < 400) {
                  setTimeout(() => input.focus(), 0)
                  return
                }
                commitRename(input.value)
              }}
              onKeyDown={(event) => {
                if (isImeOwnedKeyboardEvent(event)) {
                  return
                }
                if (event.key === 'Enter') {
                  commitRename(event.currentTarget.value)
                } else if (event.key === 'Escape') {
                  editStartedAt.current = 0
                  setEditing(false)
                }
              }}
            />
          ) : null}
          <span className="flex shrink-0 opacity-0 group-hover/fork-chat:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={
                    categoryId
                      ? t('orcaFork.chatStructure.newChannelHere', 'New channel here')
                      : t('orcaFork.chatStructure.addToChannels', 'Add to Channels')
                  }
                >
                  <Plus className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" sideOffset={4}>
                <ForkSidebarCreateMenuItems
                  menu="dropdown"
                  kinds={['channel']}
                  categoryId={categoryId}
                />
                <DropdownMenuSeparator />
                <ForkSidebarCreateMenuItems menu="dropdown" kinds={['category']} />
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">{menuItems}</ContextMenuContent>
    </ContextMenu>
  )
}
