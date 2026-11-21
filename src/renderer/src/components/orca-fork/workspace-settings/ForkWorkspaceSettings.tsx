// orca-fork: the active workspace's settings over the whole app, as agentes.chat's workspace menu: the app
// blurs behind, a large header with its photo and name, then tabs General · Members · Connectors · Agents ·
// Access · Machine.
import React, { useLayoutEffect, useRef } from 'react'
import * as DialogPrimitive from 'radix-ui/dialog'
import { Laptop, Server, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslate } from '@/i18n/use-translate'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import { ForkWorkspaceMark } from '../workspaces/ForkWorkspaceMark'
import { useActiveForkWorkspace } from '../workspaces/fork-workspaces-store'
import { useForkWorkspaceMachines } from '../workspaces/use-fork-workspace-machines'
import {
  closeWorkspaceSettings,
  openWorkspaceSettings,
  takeWorkspaceSettingsAnchor,
  useWorkspaceSettingsTab,
  WORKSPACE_SETTINGS_TABS,
  type WorkspaceSettingsTab
} from './workspace-settings-open'
import { useWorkspaceBots } from './use-workspace-bots'
import { WorkspaceGeneralTab } from './WorkspaceGeneralTab'
import { WorkspaceMembersTab } from './WorkspaceMembersTab'
import { WorkspaceConnectorsTab } from './WorkspaceConnectorsTab'
import { WorkspaceAgentsTab } from './WorkspaceAgentsTab'
import { WorkspaceAccessTab } from './WorkspaceAccessTab'
import { WorkspaceMachineTab } from './WorkspaceMachineTab'
import { WorkspaceSwitchList } from './WorkspaceSwitchList'
import './fork-workspace-settings.css'

const FACES_SHOWN = 4

function useTabLabel(): (tab: WorkspaceSettingsTab) => string {
  const t = useTranslate()
  return (tab) => {
    switch (tab) {
      case 'general':
        return t('orcaFork.workspaceSettings.tabs.general', 'General')
      case 'members':
        return t('orcaFork.workspaceSettings.tabs.members', 'Members')
      case 'connectors':
        return t('orcaFork.workspaceSettings.tabs.connectors', 'Connectors')
      case 'agents':
        return t('orcaFork.workspaceSettings.tabs.agents', 'Agents')
      case 'access':
        return t('orcaFork.workspaceSettings.tabs.access', 'Access')
      case 'machine':
        return t('orcaFork.workspaceSettings.tabs.machine', 'Machine')
    }
  }
}

export function ForkWorkspaceSettings(): React.JSX.Element | null {
  const tab = useWorkspaceSettingsTab()
  return tab ? <ForkWorkspaceSettingsOverlay tab={tab} /> : null
}

function ForkWorkspaceSettingsOverlay({ tab }: { tab: WorkspaceSettingsTab }): React.JSX.Element {
  const t = useTranslate()
  const tabLabel = useTabLabel()
  const workspace = useActiveForkWorkspace()
  const machines = useForkWorkspaceMachines()
  const { bots } = useWorkspaceBots()
  const machine = machines.find((m) => m.hostId === workspace.hostId)
  const MachineIcon = workspace.hostId === LOCAL_EXECUTION_HOST_ID ? Laptop : Server

  // The app blurs behind while open.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.forkWorkspaceSettings = ''
    return () => {
      delete root.dataset.forkWorkspaceSettings
    }
  }, [])

  // The header grows out of the card that opened it (FLIP), as agentes.chat's MenuOverlay.
  const header = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const from = takeWorkspaceSettingsAnchor()
    const to = header.current?.getBoundingClientRect()
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!from || !to || to.width === 0 || reduced || !header.current?.animate) {
      return
    }
    header.current.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          transformOrigin: '0 0',
          opacity: 0.3
        },
        { transform: 'none', transformOrigin: '0 0', opacity: 1 }
      ],
      { duration: 600, easing: 'cubic-bezier(.3,1.2,.4,1)' }
    )
  }, [])

  // 1–6 open a tab, as the menu's digits do, unless typing.
  const onKeyDown = (event: React.KeyboardEvent): void => {
    const target = event.target
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select') !== null))
    ) {
      return
    }
    const next = WORKSPACE_SETTINGS_TABS[Number(event.key) - 1]
    if (/^[1-6]$/.test(event.key) && next) {
      event.preventDefault()
      openWorkspaceSettings(next)
    }
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && closeWorkspaceSettings()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          data-fork-workspace-settings=""
          onKeyDown={onKeyDown}
          className="scrollbar-sleek fixed inset-0 z-50 overflow-y-auto px-4 pt-16 pb-14 outline-none sm:px-6 sm:pt-[88px]"
          onPointerDown={(event) => {
            // A click on the empty stage closes it, like the scrim.
            if (event.target === event.currentTarget) {
              closeWorkspaceSettings()
            }
          }}
        >
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-5 right-6 z-10"
              aria-label={t('orcaFork.workspaceSettings.close', 'Close')}
            >
              <X className="size-5" />
            </Button>
          </DialogPrimitive.Close>
          <div className="mx-auto flex max-w-[720px] flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <header ref={header} className="flex min-w-0 items-center gap-4">
              <ForkWorkspaceMark workspace={workspace} size={82} className="rounded-2xl" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogPrimitive.Title className="truncate text-5xl leading-[52px] font-light tracking-tight text-foreground">
                  {workspace.name}
                </DialogPrimitive.Title>
                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MachineIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {machine?.label ??
                        t('orcaFork.workspaces.machineOffline', 'Machine not paired')}
                    </span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t('orcaFork.workspaceSettings.agentCount', 'Agents: {{count}}', {
                      count: bots.length
                    })}
                  </span>
                  {bots.length > 0 ? (
                    <span className="flex items-center -space-x-1.5">
                      {bots.slice(0, FACES_SHOWN).map((bot) => (
                        <BotAvatar
                          key={`${bot.hostId}/${bot.id}`}
                          bot={bot}
                          className="size-5 ring-2 ring-background"
                        />
                      ))}
                    </span>
                  ) : null}
                </span>
              </div>
            </header>
            <Tabs
              value={tab}
              onValueChange={(value) => {
                const next = WORKSPACE_SETTINGS_TABS.find((id) => id === value)
                if (next) {
                  openWorkspaceSettings(next)
                }
              }}
            >
              <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                {WORKSPACE_SETTINGS_TABS.map((id, index) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="flex-none"
                    title={`${tabLabel(id)} (${index + 1})`}
                  >
                    {tabLabel(id)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-lg">
                <TabsContent value="general">
                  <WorkspaceGeneralTab key={workspace.id} workspace={workspace} />
                </TabsContent>
                <TabsContent value="members">
                  <WorkspaceMembersTab />
                </TabsContent>
                <TabsContent value="connectors">
                  <WorkspaceConnectorsTab />
                </TabsContent>
                <TabsContent value="agents">
                  <WorkspaceAgentsTab />
                </TabsContent>
                <TabsContent value="access">
                  <WorkspaceAccessTab />
                </TabsContent>
                <TabsContent value="machine">
                  <WorkspaceMachineTab workspace={workspace} />
                </TabsContent>
              </div>
            </Tabs>
            <WorkspaceSwitchList />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
