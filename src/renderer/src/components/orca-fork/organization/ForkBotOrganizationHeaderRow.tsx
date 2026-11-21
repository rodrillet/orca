// orca-fork: a department, section or machine header in the Bots list.
import React, { useRef, useState } from 'react'
import { ChevronRight, FolderPlus, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import {
  botOrganizationEdits,
  type BotOrganizationHeader
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from './bot-organization-store'
import { claimForkWorkspaceDepartment } from '../workspaces/fork-workspace-departments'
import { acceptsBotOrganizationDrag, dropBotOrganizationEntry } from './bot-organization-drag'
import { newOrganizationId, requestHeaderRename, takeHeaderRename } from './bot-organization-rename'

export function addBotDepartment(name: string): void {
  const id = newOrganizationId()
  requestHeaderRename(`fork-org:${id}`)
  editBotOrganization(botOrganizationEdits.addDepartment(id, name))
  claimForkWorkspaceDepartment(id)
}

export function ForkBotOrganizationHeaderRow({
  header
}: {
  header: BotOrganizationHeader
}): React.JSX.Element {
  const t = useTranslate()
  const [editing, setEditing] = useState(() => takeHeaderRename(header.id))
  const [dropping, setDropping] = useState(false)
  const editStartedAt = useRef(0)
  const target = header.target
  const droppable = target !== null || header.unassigned === true

  const commitRename = (value: string): void => {
    editStartedAt.current = 0
    setEditing(false)
    if (target && value.trim() && value.trim() !== header.title) {
      editBotOrganization(botOrganizationEdits.rename(target, value))
    }
  }
  const addSection = (): void => {
    if (!target) {
      return
    }
    const id = newOrganizationId()
    requestHeaderRename(`fork-org:${target.departmentId}/${id}`)
    editBotOrganization(
      botOrganizationEdits.addSection(
        target.departmentId,
        id,
        t('orcaFork.botOrganization.newSectionName', 'New section')
      )
    )
    if (header.collapsed) {
      editBotOrganization(botOrganizationEdits.toggleCollapsed(header.id))
    }
  }

  return (
    <div
      data-fork-org-header={header.id}
      className={cn(
        'group/fork-org relative flex h-7 items-center gap-1 rounded-md pr-1 text-[11px] font-semibold text-muted-foreground',
        header.level === 1 ? 'pl-5' : 'pl-1',
        dropping && 'bg-accent text-accent-foreground'
      )}
      onDragOver={(event) => {
        if (droppable && acceptsBotOrganizationDrag(event)) {
          setDropping(true)
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(event) => {
        setDropping(false)
        if (droppable) {
          dropBotOrganizationEntry(event, target)
        }
      }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-expanded={!header.collapsed}
        onClick={() => editBotOrganization(botOrganizationEdits.toggleCollapsed(header.id))}
      >
        <ChevronRight
          className={cn('size-3 shrink-0 transition-transform', !header.collapsed && 'rotate-90')}
        />
        {editing ? null : <span className="truncate">{header.title}</span>}
        {editing ? null : (
          <span className="shrink-0 font-medium tabular-nums opacity-70">{header.count}</span>
        )}
      </button>
      {editing ? (
        <input
          autoFocus
          defaultValue={header.title}
          aria-label={t('orcaFork.botOrganization.rename', 'Rename')}
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
      {header.unassigned ? (
        <span className="flex shrink-0 opacity-0 group-hover/fork-org:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('orcaFork.botOrganization.newDepartment', 'New department')}
            onClick={() =>
              addBotDepartment(t('orcaFork.botOrganization.newDepartmentName', 'New department'))
            }
          >
            <Plus className="size-3" />
          </Button>
        </span>
      ) : null}
      {target ? (
        <span className="flex shrink-0 opacity-0 group-hover/fork-org:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('orcaFork.botOrganization.actions', '{{name}} actions', {
                  name: header.title
                })}
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" sideOffset={4}>
              {header.level === 0 ? (
                <DropdownMenuItem onSelect={addSection}>
                  <FolderPlus className="size-3.5" />
                  {t('orcaFork.botOrganization.newSection', 'New section')}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                {t('orcaFork.botOrganization.rename', 'Rename')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => editBotOrganization(botOrganizationEdits.remove(target))}
              >
                <Trash2 className="size-3.5" />
                {header.level === 0
                  ? t('orcaFork.botOrganization.deleteDepartment', 'Delete department')
                  : t('orcaFork.botOrganization.deleteSection', 'Delete section')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ) : null}
    </div>
  )
}
