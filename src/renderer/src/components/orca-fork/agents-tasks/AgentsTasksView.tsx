// orca-fork: the Tasks page's Agents view: every bot on every paired machine, grouped by machine.
import React, { useMemo } from 'react'
import { KanbanSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBotHostLabel } from '@/components/bots/use-bot-host-label'
import { isHome, useBotHomeWorkspaces, useBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import {
  getLocalExecutionHostLabel,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import { sortBotsBySidebarOrder } from '../../../../../shared/bots/bot-homes'
import type { FolderWorkspace } from '../../../../../shared/folder-workspaces/folder-workspace-types'
import { AgentTaskCard } from './AgentTaskCard'
import { botWorkListRead } from './use-bot-work-list'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { openAgentsBoard } from '../agents-board/open-agents-board'

const NO_GROUPS: readonly Bot[] = []

function MachineSection({
  hostId,
  bots,
  homes
}: {
  hostId: ExecutionHostId
  bots: readonly Bot[]
  homes: readonly FolderWorkspace[]
}): React.JSX.Element {
  const label = useBotHostLabel(hostId) ?? getLocalExecutionHostLabel()
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">
        {label} · {bots.length}
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {bots.map((bot) => (
          <AgentTaskCard
            key={bot.id}
            bot={bot}
            hostLabel={label}
            home={homes.find((home) => isHome(home, [bot])) ?? null}
          />
        ))}
      </div>
    </section>
  )
}

export function AgentsTasksView(): React.JSX.Element {
  const t = useTranslate()
  const bots = useBots()
  const homes = useBotHomeWorkspaces(bots, NO_GROUPS)
  const sections = useMemo(() => {
    const groups = new Map<ExecutionHostId, Bot[]>()
    for (const bot of bots) {
      groups.set(bot.hostId, [...(groups.get(bot.hostId) ?? []), bot])
    }
    return [...groups.entries()].map(
      ([hostId, hostBots]) => [hostId, sortBotsBySidebarOrder(hostBots)] as const
    )
  }, [bots])

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-sm font-semibold">{t('orcaFork.agentsTasks.title', 'Agents')}</h1>
        <div className="flex items-center gap-1">
          {FORK_FEATURES.agentsBoard ? (
            <Button variant="ghost" size="sm" onClick={openAgentsBoard}>
              <KanbanSquare className="size-3.5" />
              {t('orcaFork.agentsTasks.openBoard', 'Board')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => bots.forEach((bot) => botWorkListRead.request(bot))}
          >
            <RefreshCw className="size-3.5" />
            {t('orcaFork.agentsTasks.refresh', 'Refresh')}
          </Button>
        </div>
      </div>
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {bots.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t('orcaFork.agentsTasks.empty', 'No bots on this computer or its paired servers yet.')}
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {sections.map(([hostId, hostBots]) => (
              <MachineSection key={hostId} hostId={hostId} bots={hostBots} homes={homes} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
