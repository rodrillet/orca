// orca-fork: one section of a department: rename, delete, drag to reorder, drop bots onto it.
import React, { useState } from 'react'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from '../organization/bot-organization-store'
import {
  acceptsBotOrganizationDrag,
  dropBotOrganizationEntry
} from '../organization/bot-organization-drag'
import { DepartmentMemberChip } from './DepartmentMemberChip'
import type { DepartmentMember, DepartmentWorld } from './use-department-world'
import type { useListReorder } from './use-list-reorder'

type Dept = DepartmentWorld['departments'][number]

export function SectionRow({
  dept,
  section,
  members,
  reorder
}: {
  dept: Dept
  section: Dept['sections'][number]
  members: DepartmentMember[]
  reorder: ReturnType<typeof useListReorder>
}): React.JSX.Element {
  const t = useTranslate()
  const [editing, setEditing] = useState(false)
  const [over, setOver] = useState(false)
  const target = { departmentId: dept.id, sectionId: section.id }
  const commit = (value: string): void => {
    setEditing(false)
    if (value.trim() && value.trim() !== section.name) {
      editBotOrganization(botOrganizationEdits.rename(target, value))
    }
  }
  return (
    <div
      {...reorder.itemProps(section.id)}
      onDragOver={(event) => {
        if (acceptsBotOrganizationDrag(event)) {
          setOver(true)
        } else {
          reorder.itemProps(section.id).onDragOver?.(event)
        }
      }}
      onDragLeave={(event) => {
        setOver(false)
        reorder.itemProps(section.id).onDragLeave?.(event)
      }}
      onDrop={(event) => {
        setOver(false)
        if (acceptsBotOrganizationDrag(event)) {
          dropBotOrganizationEntry(event, target)
        } else {
          reorder.itemProps(section.id).onDrop?.(event)
        }
      }}
      className={cn(
        'group/section flex flex-col gap-2 rounded-md border border-border p-3',
        (over || reorder.isDropTarget(section.id)) && 'border-ring ring-1 ring-ring'
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="size-3.5 cursor-grab text-muted-foreground" aria-hidden />
        {editing ? (
          <Input
            autoFocus
            defaultValue={section.name}
            aria-label={t('orcaFork.botOrganization.rename', 'Rename')}
            onBlur={(event) => commit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (isImeOwnedKeyboardEvent(event)) {
                return
              }
              if (event.key === 'Enter') {
                commit(event.currentTarget.value)
              } else if (event.key === 'Escape') {
                setEditing(false)
              }
            }}
            className="h-7 flex-1"
          />
        ) : (
          <span className="flex-1 truncate text-sm font-medium">{section.name}</span>
        )}
        <span className="text-xs tabular-nums text-muted-foreground">{members.length}</span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('orcaFork.botOrganization.rename', 'Rename')}
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('orcaFork.botOrganization.deleteSection', 'Delete section')}
          onClick={() => editBotOrganization(botOrganizationEdits.remove(target))}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {members.length > 0 ? (
          members.map((member) => <DepartmentMemberChip key={member.key} member={member} />)
        ) : (
          <span className="text-xs text-muted-foreground">
            {t('orcaFork.departments.dropHere', 'Drag bots here')}
          </span>
        )}
      </div>
    </div>
  )
}
