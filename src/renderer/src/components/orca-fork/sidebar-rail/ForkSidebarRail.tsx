// orca-fork: the sidebar's compact mode, agentes.chat's icon rail: the workspace's photo (its settings),
// expand, the tools, the bot groups and the agents with their presence, then notifications and my photo.
import React, { useEffect, useState } from 'react'
import { Bell, HardDrive, Library, ListChecks, PanelLeftOpen, Search } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { openBotHome } from '@/lib/bot-catalog'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { ForkWorkspaceMark } from '../workspaces/ForkWorkspaceMark'
import { useActiveForkWorkspace } from '../workspaces/fork-workspaces-store'
import { useForkWorkspaceMachines } from '../workspaces/use-fork-workspace-machines'
import { useForkWorkspaceScope } from '../workspaces/use-fork-workspace-scope'
import { useForkWorkspaceDepartmentMigration } from '../workspaces/fork-workspace-departments'
import { openForkDrivePage, useForkDriveActive } from '../drive/drive-page-state'
import { closeWikiPage, openWikiPage, useWikiPageOpen } from '../wiki/wiki-view-state'
import { useWikiPlacementSync } from '../wiki/use-wiki-placement-sync'
import { ForkGroupPicture } from '../group-photos/ForkGroupPicture'
import { useForkBotPresence } from '../presence/ForkBotPresenceDot'
import type { Bot } from '../../../../../shared/bot-types'
import { OwnerAvatar, useOwnerDisplayName } from '../owner-profile/OwnerAvatar'
import { openOwnerProfile } from '../owner-profile/owner-profile-open'
import { ForkGroupInitials } from '../workspace-settings/workspace-group-picture'
import { useWorkspaceBots } from '../workspace-settings/use-workspace-bots'
import { openWorkspaceSettings } from '../workspace-settings/workspace-settings-open'
import { FORK_SIDEBAR_RAIL_WIDTH, setForkSidebarMode } from './sidebar-mode-store'
import { FORK_SIDEBAR_MODE_SHORTCUT_LABEL } from './use-fork-sidebar-mode-shortcut'

const TILE =
  'relative flex size-10 shrink-0 items-center justify-center rounded-lg text-worktree-sidebar-foreground/60 outline-none transition-colors hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring'
const TILE_ACTIVE = 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'

function RailTile({
  label,
  active,
  onClick,
  children,
  className
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={onClick}
          className={cn(TILE, active && TILE_ACTIVE, className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function RailDivider(): React.JSX.Element {
  return <span aria-hidden="true" className="my-1 h-px w-8 shrink-0 bg-worktree-sidebar-border" />
}

/** Reports whether one bot is stopped or needs the owner, so the bell can count them. */
function NeedsYouProbe({
  bot,
  onChange
}: {
  bot: Bot
  onChange: (key: string, needsYou: boolean) => void
}): null {
  const needsYou = useForkBotPresence(bot) === 'blocked'
  const key = `${bot.hostId}/${bot.id}`
  useEffect(() => {
    onChange(key, needsYou)
    return () => onChange(key, false)
  }, [key, needsYou, onChange])
  return null
}

export function ForkSidebarRail(): React.JSX.Element {
  const t = useTranslate()
  const workspace = useActiveForkWorkspace()
  const machines = useForkWorkspaceMachines()
  // The full sidebar's switcher keeps these going; the rail replaces it.
  useForkWorkspaceScope(machines)
  useForkWorkspaceDepartmentMigration()
  useWikiPlacementSync()
  const { bots, groups } = useWorkspaceBots()
  const openModal = useAppStore((s) => s.openModal)
  const openTaskPage = useAppStore((s) => s.openTaskPage)
  const setSidebarBody = useAppStore((s) => s.setSidebarBody)
  const tasksActive = useAppStore((s) => s.activeView === 'tasks')
  const driveActive = useForkDriveActive()
  const wikiOpen = useWikiPageOpen()
  const ownerName = useOwnerDisplayName()
  const [blockedBots, setBlockedBots] = useState<ReadonlySet<string>>(() => new Set())
  const reportNeedsYou = React.useCallback((key: string, blocked: boolean) => {
    setBlockedBots((prev) => {
      if (prev.has(key) === blocked) {
        return prev
      }
      const next = new Set(prev)
      if (blocked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])
  const needsYou = blockedBots.size
  const expandLabel = `${t('orcaFork.sidebarRail.expand', 'Expand sidebar')} (${FORK_SIDEBAR_MODE_SHORTCUT_LABEL})`

  return (
    <nav
      data-fork-sidebar-rail=""
      aria-label={t('orcaFork.sidebarRail.label', 'Compact sidebar')}
      style={{ width: FORK_SIDEBAR_RAIL_WIDTH }}
      className="flex min-h-0 flex-1 flex-col items-center gap-1 py-2 [.titlebar-left-floating~*_&]:pt-[44px]"
    >
      <RailTile
        label={t('orcaFork.workspaceSettings.openOf', '{{name}} workspace settings', {
          name: workspace.name
        })}
        onClick={() => openWorkspaceSettings('general')}
        className="hover:bg-transparent"
      >
        <ForkWorkspaceMark workspace={workspace} size={36} className="rounded-lg" />
      </RailTile>
      <RailTile label={expandLabel} onClick={() => setForkSidebarMode('full')}>
        <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} />
      </RailTile>
      <RailDivider />
      <div className="scrollbar-sleek flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto">
        <RailTile
          label={t('orcaFork.sidebarRail.search', 'Search')}
          onClick={() => openModal('worktree-palette')}
        >
          <Search className="size-[18px]" strokeWidth={1.75} />
        </RailTile>
        <RailTile
          label={t('orcaFork.sidebarRail.tasks', 'Tasks')}
          active={tasksActive}
          onClick={() => openTaskPage()}
        >
          <ListChecks className="size-[18px]" strokeWidth={1.75} />
        </RailTile>
        {FORK_FEATURES.drive ? (
          <RailTile
            label={t('orcaFork.drive.title', 'Drive')}
            active={driveActive}
            onClick={openForkDrivePage}
          >
            <HardDrive className="size-[18px]" strokeWidth={1.75} />
          </RailTile>
        ) : null}
        {FORK_FEATURES.workspaceWiki ? (
          <RailTile
            label={t('orcaFork.sidebarRail.wiki', 'Wiki')}
            active={wikiOpen}
            onClick={() => (wikiOpen ? closeWikiPage() : openWikiPage())}
          >
            <Library className="size-[18px]" strokeWidth={1.75} />
          </RailTile>
        ) : null}
        {groups.length > 0 ? <RailDivider /> : null}
        {groups.map((group) => (
          <RailTile
            key={`${group.hostId}/${group.id}`}
            label={group.name}
            onClick={() => void openBotGroup(group)}
          >
            <ForkGroupPicture groupId={group.id} className="size-8">
              <ForkGroupInitials name={group.name} className="size-8" />
            </ForkGroupPicture>
          </RailTile>
        ))}
        {bots.length > 0 ? <RailDivider /> : null}
        {bots.map((bot) => (
          <NeedsYouProbe
            key={`probe:${bot.hostId}/${bot.id}`}
            bot={bot}
            onChange={reportNeedsYou}
          />
        ))}
        {bots.map((bot) => (
          <RailTile
            key={`${bot.hostId}/${bot.id}`}
            label={bot.name}
            onClick={() => openBotHome(bot)}
          >
            <BotAvatar bot={bot} className="size-8" />
          </RailTile>
        ))}
      </div>
      <RailDivider />
      <RailTile
        label={
          needsYou > 0
            ? t(
                'orcaFork.sidebarRail.notificationsCount',
                'Notifications · {{count}} waiting on you',
                {
                  count: needsYou
                }
              )
            : t('orcaFork.sidebarRail.notifications', 'Notifications')
        }
        onClick={() => {
          setSidebarBody('agents')
          setForkSidebarMode('full')
        }}
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {needsYou > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
            {needsYou > 99 ? '99+' : needsYou}
          </span>
        ) : null}
      </RailTile>
      <RailTile
        label={t('orcaFork.sidebarRail.profile', '{{name}} · profile and status', {
          name: ownerName
        })}
        onClick={openOwnerProfile}
        className="hover:bg-transparent"
      >
        <OwnerAvatar className="size-8 text-sm" />
      </RailTile>
    </nav>
  )
}
