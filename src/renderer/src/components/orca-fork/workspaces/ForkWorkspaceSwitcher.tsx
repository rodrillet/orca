// orca-fork: the sidebar's top row, agentes.chat's workspace header: the active workspace's photo, name
// and machine; its menu switches workspace, makes a new one or opens its settings.
import React, { useState } from 'react'
import {
  Check,
  ChevronsUpDown,
  Laptop,
  PanelLeftDashed,
  Plus,
  Server,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import {
  activeForkWorkspace,
  type ForkWorkspace
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { ForkWorkspaceDialog, type ForkWorkspaceDialogTarget } from './ForkWorkspaceDialog'
import { ForkWorkspaceMark } from './ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from './fork-workspaces-store'
import { useForkWorkspaceMachines } from './use-fork-workspace-machines'
import { useForkWorkspaceScope } from './use-fork-workspace-scope'
import { useForkWorkspaceDepartmentMigration } from './fork-workspace-departments'
import { openWorkspaceSettings } from '../workspace-settings/workspace-settings-open'
import { setForkSidebarMode } from '../sidebar-rail/sidebar-mode-store'
import { FORK_SIDEBAR_MODE_SHORTCUT_LABEL } from '../sidebar-rail/use-fork-sidebar-mode-shortcut'

function MachineIcon({ hostId, className }: { hostId: ExecutionHostId; className?: string }) {
  const Icon = hostId === LOCAL_EXECUTION_HOST_ID ? Laptop : Server
  return <Icon className={cn('size-3 shrink-0', className)} aria-hidden="true" />
}

export function ForkWorkspaceSwitcher(): React.JSX.Element | null {
  if (!FORK_FEATURES.workspaces) {
    return null
  }
  return <ForkWorkspaceSwitcherRow />
}

function ForkWorkspaceSwitcherRow(): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const machines = useForkWorkspaceMachines()
  useForkWorkspaceScope(machines)
  useForkWorkspaceDepartmentMigration()
  const [dialog, setDialog] = useState<ForkWorkspaceDialogTarget | null>(null)
  const active = activeForkWorkspace(doc)
  const machineLabel = (ws: ForkWorkspace): string =>
    machines.find((m) => m.hostId === ws.hostId)?.label ??
    t('orcaFork.workspaces.machineOffline', 'Machine not paired')

  const managed = FORK_FEATURES.workspaceManagement
  const identity = (
    <>
      <ForkWorkspaceMark workspace={active} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-foreground">{active.name}</span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <MachineIcon hostId={active.hostId} />
          <span className="truncate">{machineLabel(active)}</span>
        </span>
      </span>
    </>
  )
  const rowButton =
    'flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent'

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 px-2 pt-2 pb-1"
      data-fork-workspace-switcher=""
    >
      {managed ? (
        <button
          type="button"
          className={cn(rowButton, 'flex-1')}
          aria-haspopup="dialog"
          aria-label={t('orcaFork.workspaceSettings.openOf', '{{name}} workspace settings', {
            name: active.name
          })}
          onClick={() => openWorkspaceSettings('general')}
        >
          {identity}
        </button>
      ) : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {managed ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={t('orcaFork.workspaces.switch', 'Switch workspace')}
              title={t('orcaFork.workspaces.switch', 'Switch workspace')}
            >
              <ChevronsUpDown className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <button
              type="button"
              className={cn(rowButton, 'w-full')}
              aria-label={t('orcaFork.workspaces.menuOf', '{{name}} workspace menu', {
                name: active.name
              })}
            >
              {identity}
              <ChevronsUpDown
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4} className="min-w-64">
          <DropdownMenuLabel>
            {t('orcaFork.workspaces.yourWorkspaces', 'Your workspaces')}
          </DropdownMenuLabel>
          {doc.workspaces.map((ws) => {
            const current = ws.id === active.id
            return (
              <DropdownMenuItem
                key={ws.id}
                data-current={current ? 'true' : undefined}
                onSelect={() => forkWorkspacesStore.edit(forkWorkspaceEdits.setActive(ws.id))}
              >
                <ForkWorkspaceMark workspace={ws} size={24} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{ws.name}</span>
                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <MachineIcon hostId={ws.hostId} />
                    <span className="truncate">{machineLabel(ws)}</span>
                  </span>
                </span>
                {current ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog({ mode: 'create' })}>
            <Plus className="size-4" />
            {t('orcaFork.workspaces.new', 'New workspace…')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              managed
                ? openWorkspaceSettings('general')
                : setDialog({ mode: 'edit', workspace: active })
            }
          >
            <Settings className="size-4" />
            {t('orcaFork.workspaces.settings', 'Workspace settings…')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {FORK_FEATURES.sidebarRail ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={t('orcaFork.sidebarRail.compact', 'Compact sidebar')}
              onClick={() => setForkSidebarMode('compact')}
            >
              <PanelLeftDashed className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('orcaFork.sidebarRail.compact', 'Compact sidebar')} (
            {FORK_SIDEBAR_MODE_SHORTCUT_LABEL})
          </TooltipContent>
        </Tooltip>
      ) : null}
      <ForkWorkspaceDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}
