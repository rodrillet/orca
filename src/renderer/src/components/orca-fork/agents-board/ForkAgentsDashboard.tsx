// orca-fork: the Agent Dashboard drawer opens on the bots board; the upstream terminals board is one click away.
import React from 'react'
import { Bot as BotIcon, SquareTerminal } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { AgentsBoard } from './AgentsBoard'
import {
  updateAgentsBoardPrefs,
  useAgentsBoardPrefs,
  type AgentsBoardView
} from './agents-board-prefs'

function ViewSwitch({ view }: { view: AgentsBoardView }): React.JSX.Element {
  const t = useTranslate()
  const options: { id: AgentsBoardView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'bots',
      label: t('orcaFork.agentsBoard.view.bots', 'Bots'),
      icon: <BotIcon className="size-3" />
    },
    {
      id: 'terminals',
      label: t('orcaFork.agentsBoard.view.terminals', 'Terminals'),
      icon: <SquareTerminal className="size-3" />
    }
  ]
  return (
    <div
      role="tablist"
      aria-label={t('orcaFork.agentsBoard.view.label', 'Board view')}
      className="ml-2 flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={view === option.id}
          onClick={() => updateAgentsBoardPrefs({ view: option.id })}
          className={cn(
            'flex h-6 items-center gap-1 rounded-[5px] px-2 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            view === option.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ForkAgentsDashboard({
  terminals,
  onClose,
  onNavigate
}: {
  /** The upstream board, given the switch to show in its header. */
  terminals: (viewSwitch: React.ReactNode) => React.ReactNode
  onClose: () => void
  onNavigate: () => void
}): React.ReactNode {
  const { view } = useAgentsBoardPrefs()
  if (!FORK_FEATURES.agentsBoard) {
    return terminals(null)
  }
  const viewSwitch = <ViewSwitch view={view} />
  return view === 'terminals' ? (
    terminals(viewSwitch)
  ) : (
    <AgentsBoard viewSwitch={viewSwitch} onClose={onClose} onNavigate={onNavigate} />
  )
}
