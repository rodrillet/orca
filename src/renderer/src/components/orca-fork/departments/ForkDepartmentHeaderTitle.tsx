// orca-fork: a department or section header's title in the Bots list: the chevron folds it, the mark
// and name open the Department page.
import React from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import {
  botOrganizationEdits,
  type BotOrganizationHeader,
  type BotOrganizationPlacement
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { departmentProfileOf } from '../../../../../shared/orca-fork/departments/department-edits'
import { editBotOrganization, useBotOrganization } from '../organization/bot-organization-store'
import { openDepartmentPage, useDepartmentPageState } from './department-page-state'
import { DepartmentMark } from './DepartmentMark'

export function ForkDepartmentHeaderTitle({
  header,
  target,
  editing
}: {
  header: BotOrganizationHeader
  target: BotOrganizationPlacement
  editing: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const doc = useBotOrganization()
  const page = useDepartmentPageState()
  const profile = departmentProfileOf(doc, target.departmentId)
  const current = page.open && page.departmentId === target.departmentId && header.level === 0
  return (
    <span data-fork-department-nav="" className="flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        aria-expanded={!header.collapsed}
        aria-label={
          header.collapsed
            ? t('orcaFork.departments.expand', 'Expand')
            : t('orcaFork.departments.collapse', 'Collapse')
        }
        className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => editBotOrganization(botOrganizationEdits.toggleCollapsed(header.id))}
      >
        <ChevronRight
          className={cn('size-3 shrink-0 transition-transform', !header.collapsed && 'rotate-90')}
        />
      </button>
      {editing ? null : (
        <button
          type="button"
          title={t('orcaFork.departments.open', 'Open department')}
          aria-current={current ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            current && 'text-foreground'
          )}
          onClick={() => openDepartmentPage(target.departmentId)}
        >
          {header.level === 0 ? <DepartmentMark profile={profile} className="size-3.5" /> : null}
          <span className="truncate">{header.title}</span>
          <span className="shrink-0 font-medium tabular-nums opacity-70">{header.count}</span>
        </button>
      )}
    </span>
  )
}
