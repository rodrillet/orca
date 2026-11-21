// orca-fork: the Department page, an org-chart tool over the main area: departments on the left (drag to
// reorder, archived ones folded away), the org chart or one department in the middle.
import React, { useState } from 'react'
import { Archive, ChevronRight, Network, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { departmentEdits } from '../../../../../shared/orca-fork/departments/department-edits'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from '../organization/bot-organization-store'
import { addBotDepartment } from '../organization/ForkBotOrganizationHeaderRow'
import {
  closeDepartmentPage,
  openDepartmentPage,
  requestDepartmentNameEdit,
  useDepartmentPageState
} from './department-page-state'
import { DepartmentMark } from './DepartmentMark'
import { DepartmentOrgChart } from './DepartmentOrgChart'
import { DepartmentView } from './DepartmentView'
import { useDepartmentWorld, type DepartmentWorld } from './use-department-world'
import { useListReorder } from './use-list-reorder'

function NavDepartment({
  dept,
  count,
  current,
  reorder
}: {
  dept: DepartmentWorld['departments'][number]
  count: number
  current: boolean
  reorder: ReturnType<typeof useListReorder>
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...reorder.itemProps(dept.id)}
      onClick={() => openDepartmentPage(dept.id)}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
        current && 'bg-accent font-medium text-accent-foreground',
        reorder.isDropTarget(dept.id) && 'ring-1 ring-ring'
      )}
    >
      <DepartmentMark profile={dept.profile} className="size-5" />
      <span className="min-w-0 flex-1 truncate">{dept.name}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}

export function ForkDepartmentPage(): React.JSX.Element {
  const t = useTranslate()
  const view = useDepartmentPageState()
  const world = useDepartmentWorld()
  const [showArchived, setShowArchived] = useState(false)
  const active = world.departments.filter((dept) => !dept.profile.archived)
  const archived = world.departments.filter((dept) => dept.profile.archived)
  const reorder = useListReorder((id, toId) => {
    const to = world.doc.departments.findIndex((dept) => dept.id === toId)
    if (to !== -1) {
      editBotOrganization(departmentEdits.moveDepartment(id, to))
    }
  })
  const selected = world.departments.find((dept) => dept.id === view.departmentId) ?? null
  const create = (): void => {
    const id = addBotDepartment(
      t('orcaFork.botOrganization.newDepartmentName', 'New department'),
      false
    )
    // The Bots list shows departments from the first one on, as "Move to…" does.
    if (world.doc.view.groupBy !== 'organization') {
      editBotOrganization(botOrganizationEdits.setGroupBy('organization'))
    }
    requestDepartmentNameEdit(id)
    openDepartmentPage(id, 'overview')
  }

  return (
    <div
      className="absolute inset-0 z-[15] flex min-h-0 bg-background"
      data-testid="orca-fork-departments"
    >
      <nav className="flex w-64 shrink-0 flex-col gap-2 border-r border-border px-2 pt-2 pb-2">
        <div className="flex items-center gap-1 px-1">
          <h2 className="flex-1 text-base font-semibold tracking-tight">
            {t('orcaFork.departments.title', 'Departments')}
          </h2>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('orcaFork.botOrganization.newDepartment', 'New department')}
            onClick={create}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('orcaFork.departments.close', 'Close departments')}
            onClick={closeDepartmentPage}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 scrollbar-sleek">
          <button
            type="button"
            onClick={() => openDepartmentPage(null)}
            aria-current={selected === null ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
              selected === null && 'bg-accent font-medium text-accent-foreground'
            )}
          >
            <Network className="size-4 text-muted-foreground" />
            {t('orcaFork.departments.orgChart', 'Org chart')}
          </button>
          <h3 className="mt-2 px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('orcaFork.departments.active', 'Departments')}
          </h3>
          {active.map((dept) => (
            <NavDepartment
              key={dept.id}
              dept={dept}
              count={world.membersOf(dept.id).length}
              current={dept.id === selected?.id}
              reorder={reorder}
            />
          ))}
          {active.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              {t('orcaFork.departments.none', 'No departments yet.')}
            </p>
          ) : null}
          {archived.length > 0 ? (
            <>
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived(!showArchived)}
                className="mt-2 flex items-center gap-1 px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <ChevronRight
                  className={cn('size-3 transition-transform', showArchived && 'rotate-90')}
                />
                <Archive className="size-3" />
                {t('orcaFork.departments.archived', 'Archived')} · {archived.length}
              </button>
              {showArchived
                ? archived.map((dept) => (
                    <NavDepartment
                      key={dept.id}
                      dept={dept}
                      count={world.membersOf(dept.id).length}
                      current={dept.id === selected?.id}
                      reorder={reorder}
                    />
                  ))
                : null}
            </>
          ) : null}
        </div>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-6 pb-8 scrollbar-sleek">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
          {selected ? (
            <DepartmentView key={selected.id} dept={selected} world={world} tab={view.tab} />
          ) : (
            <DepartmentOrgChart world={world} onCreate={create} />
          )}
        </div>
      </main>
    </div>
  )
}

export default ForkDepartmentPage
