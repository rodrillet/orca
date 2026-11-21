// orca-fork: one department: its mark and name, quick actions, and the Overview / Defaults / Dashboard tabs.
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Archive,
  ArchiveRestore,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { BOT_AVATAR_COLORS } from '../../../../../shared/bots/bot-avatar-color'
import { DEPARTMENT_ICONS } from '../../../../../shared/orca-fork/departments/department-profile'
import { departmentEdits } from '../../../../../shared/orca-fork/departments/department-edits'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from '../organization/bot-organization-store'
import {
  DEPARTMENT_TABS,
  openDepartmentPage,
  showDepartmentTab,
  takeDepartmentNameEdit,
  type DepartmentTab
} from './department-page-state'
import { openDepartmentRoom } from './department-room'
import { resyncDepartmentSouls } from './department-apply'
import { DEPARTMENT_ICON_COMPONENTS, DepartmentMark } from './DepartmentMark'
import { DepartmentOverview } from './DepartmentOverview'
import { DepartmentDefaultsPanel } from './DepartmentDefaultsPanel'
import { DepartmentDashboard } from './DepartmentDashboard'
import type { DepartmentWorld } from './use-department-world'

type Dept = DepartmentWorld['departments'][number]

function LookPicker({ dept }: { dept: Dept }): React.JSX.Element {
  const t = useTranslate()
  const set = (patch: Parameters<typeof departmentEdits.setProfile>[1]): void =>
    editBotOrganization(departmentEdits.setProfile(dept.id, patch))
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('orcaFork.departments.changeLook', 'Change color and icon')}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DepartmentMark profile={dept.profile} className="size-12" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('orcaFork.departments.color', 'Color')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BOT_AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={(dept.profile.color ?? BOT_AVATAR_COLORS[0]) === color}
                  onClick={() => set({ color })}
                  className={cn(
                    'size-6 rounded-full border border-border',
                    (dept.profile.color ?? BOT_AVATAR_COLORS[0]) === color &&
                      'ring-2 ring-ring ring-offset-1 ring-offset-background'
                  )}
                  // The swatch shows the color it picks.
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('orcaFork.departments.icon', 'Icon')}
            </span>
            <div className="grid grid-cols-8 gap-1">
              {DEPARTMENT_ICONS.map((icon) => {
                const Icon = DEPARTMENT_ICON_COMPONENTS[icon]
                const on = (dept.profile.icon ?? 'building') === icon
                return (
                  <Button
                    key={icon}
                    type="button"
                    size="icon-xs"
                    variant={on ? 'secondary' : 'ghost'}
                    aria-label={icon}
                    aria-pressed={on}
                    onClick={() => set({ icon })}
                  >
                    <Icon className="size-3.5" />
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NameField({ dept }: { dept: Dept }): React.JSX.Element {
  const t = useTranslate()
  const [editing, setEditing] = useState(() => takeDepartmentNameEdit(dept.id))
  const commit = (value: string): void => {
    setEditing(false)
    const name = value.trim()
    if (name && name !== dept.name) {
      editBotOrganization(
        botOrganizationEdits.rename({ departmentId: dept.id, sectionId: null }, name)
      )
    }
  }
  if (editing) {
    return (
      <Input
        autoFocus
        defaultValue={dept.name}
        aria-label={t('orcaFork.departments.name', 'Department name')}
        onFocus={(event) => event.currentTarget.select()}
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
        className="max-w-md"
      />
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <h1 className="truncate text-2xl font-semibold tracking-tight">{dept.name}</h1>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t('orcaFork.departments.name', 'Department name')}
        onClick={() => setEditing(true)}
      >
        <Pencil />
      </Button>
    </div>
  )
}

export function DepartmentView({
  dept,
  world,
  tab
}: {
  dept: Dept
  world: DepartmentWorld
  tab: DepartmentTab
}): React.JSX.Element {
  const t = useTranslate()
  const members = world.membersOf(dept.id)
  const [openingRoom, setOpeningRoom] = useState(false)
  useEffect(() => resyncDepartmentSouls(dept.id), [dept.id])
  const openRoom = (): void => {
    setOpeningRoom(true)
    openDepartmentRoom(
      dept.id,
      members.flatMap((member) => (member.kind === 'bot' ? [member.bot] : []))
    )
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error))
      )
      .finally(() => setOpeningRoom(false))
  }
  const remove = (): void => {
    if (
      window.confirm(
        t(
          'orcaFork.departments.deleteConfirm',
          'Delete {{name}}? Its bots stay, under No department.',
          { name: dept.name }
        )
      )
    ) {
      editBotOrganization(botOrganizationEdits.remove({ departmentId: dept.id, sectionId: null }))
      openDepartmentPage(null)
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-4">
        <LookPicker dept={dept} />
        <div className="min-w-0 flex-1">
          <NameField key={dept.name} dept={dept} />
          <p className="text-sm text-muted-foreground">
            {dept.profile.archived
              ? t('orcaFork.departments.archivedNote', 'Archived: hidden from the sidebar.')
              : t('orcaFork.departments.memberCount', 'Members: {{count}}', {
                  count: members.length
                })}
          </p>
        </div>
        <Button variant="outline" onClick={openRoom} disabled={openingRoom}>
          <MessagesSquare className="size-4" />
          {t('orcaFork.departments.room', 'Department chat')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('orcaFork.botOrganization.actions', '{{name}} actions', {
                name: dept.name
              })}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() =>
                editBotOrganization(
                  departmentEdits.setProfile(dept.id, { archived: !dept.profile.archived })
                )
              }
            >
              {dept.profile.archived ? (
                <ArchiveRestore className="size-3.5" />
              ) : (
                <Archive className="size-3.5" />
              )}
              {dept.profile.archived
                ? t('orcaFork.departments.unarchive', 'Restore department')
                : t('orcaFork.departments.archive', 'Archive department')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={remove}>
              <Trash2 className="size-3.5" />
              {t('orcaFork.botOrganization.deleteDepartment', 'Delete department')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = DEPARTMENT_TABS.find((entry) => entry === value)
          if (next) {
            showDepartmentTab(next)
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="overview">
            {t('orcaFork.departments.tabOverview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="defaults">
            {t('orcaFork.departments.tabDefaults', 'Bot defaults')}
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            {t('orcaFork.departments.tabDashboard', 'Dashboard')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'overview' ? <DepartmentOverview dept={dept} world={world} /> : null}
      {tab === 'defaults' ? <DepartmentDefaultsPanel dept={dept} world={world} /> : null}
      {tab === 'dashboard' ? <DepartmentDashboard dept={dept} world={world} /> : null}
    </div>
  )
}
