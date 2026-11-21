// orca-fork: "Your workspaces" under the settings, as agentes.chat's workspace menu: switch, or make one.
import React, { useState } from 'react'
import { Check, Laptop, Plus, Server } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { ForkWorkspaceDialog } from '../workspaces/ForkWorkspaceDialog'
import { ForkWorkspaceMark } from '../workspaces/ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { useForkWorkspaceMachines } from '../workspaces/use-fork-workspace-machines'

const ROW =
  'flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] outline-none hover:bg-accent focus-visible:bg-accent'

export function WorkspaceSwitchList(): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const machines = useForkWorkspaceMachines()
  const [creating, setCreating] = useState(false)
  return (
    <div
      role="menu"
      aria-label={t('orcaFork.workspaces.yourWorkspaces', 'Your workspaces')}
      className="flex flex-col rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
    >
      <span className="px-3 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
        {t('orcaFork.workspaces.yourWorkspaces', 'Your workspaces')}
      </span>
      {doc.workspaces.map((ws) => {
        const current = ws.id === doc.activeWorkspaceId
        const Icon = ws.hostId === LOCAL_EXECUTION_HOST_ID ? Laptop : Server
        return (
          <button
            key={ws.id}
            type="button"
            role="menuitem"
            aria-current={current || undefined}
            className={ROW}
            onClick={() => forkWorkspacesStore.edit(forkWorkspaceEdits.setActive(ws.id))}
          >
            <ForkWorkspaceMark workspace={ws} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{ws.name}</span>
              <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <Icon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {machines.find((m) => m.hostId === ws.hostId)?.label ??
                    t('orcaFork.workspaces.machineOffline', 'Machine not paired')}
                </span>
              </span>
            </span>
            {current ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
          </button>
        )
      })}
      <button type="button" role="menuitem" className={ROW} onClick={() => setCreating(true)}>
        <span className="flex size-8 items-center justify-center rounded-md bg-muted">
          <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span>{t('orcaFork.workspaces.new', 'New workspace…')}</span>
          <span className="text-xs text-muted-foreground">
            {t(
              'orcaFork.workspaceSettings.newHint',
              'On this computer, any paired server, or a server you pair now.'
            )}
          </span>
        </span>
      </button>
      <ForkWorkspaceDialog
        target={creating ? { mode: 'create' } : null}
        onClose={() => setCreating(false)}
      />
    </div>
  )
}
