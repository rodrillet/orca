// orca-fork: right click on the sidebar's workspace header, as agentes.chat's: switch workspace,
// make a new one, open its settings, and create a channel, group, category, department or bot here.
import React from 'react'
import { ArrowLeftRight, Check, Plus, Settings } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { ForkWorkspaceMark } from '../workspaces/ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { ForkSidebarCreateMenuItems } from './ForkSidebarCreateMenuItems'

export function ForkWorkspaceContextMenu({
  onNewWorkspace,
  onSettings,
  children
}: {
  onNewWorkspace: () => void
  onSettings: () => void
  children: React.ReactElement
}): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  if (!FORK_FEATURES.chatStructure) {
    return children
  }
  const active = doc.workspaces.find((ws) => ws.id === doc.activeWorkspaceId)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {active ? <ContextMenuLabel>{active.name}</ContextMenuLabel> : null}
        {doc.workspaces.length > 1 ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowLeftRight className="size-3.5" />
              {t('orcaFork.workspaces.switch', 'Switch workspace')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-56">
              {doc.workspaces.map((ws) => (
                <ContextMenuItem
                  key={ws.id}
                  onSelect={() => forkWorkspacesStore.edit(forkWorkspaceEdits.setActive(ws.id))}
                >
                  <ForkWorkspaceMark workspace={ws} size={20} />
                  <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                  {ws.id === doc.activeWorkspaceId ? (
                    <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : null}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        <ContextMenuItem onSelect={onNewWorkspace}>
          <Plus className="size-3.5" />
          {t('orcaFork.workspaces.new', 'New workspace…')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onSettings}>
          <Settings className="size-3.5" />
          {t('orcaFork.workspaces.settings', 'Workspace settings…')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ForkSidebarCreateMenuItems menu="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}
