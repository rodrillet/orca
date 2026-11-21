// orca-fork: the Tasks source bar's "Agents" toggle.
import React from 'react'
import { Bot as BotIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { setAgentsTasksViewOpen, useAgentsTasksViewOpen } from './agents-tasks-view-state'

export function AgentsTasksSourceButton(): React.JSX.Element | null {
  const t = useTranslate()
  const active = useAgentsTasksViewOpen()
  if (!FORK_FEATURES.agentsInTasks) {
    return null
  }
  const label = t('orcaFork.agentsTasks.source', 'Agents')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setAgentsTasksViewOpen(!active)}
          data-task-source="orca-fork-agents"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'group flex h-8 w-8 items-center justify-center rounded-md border transition',
            active
              ? 'border-foreground/40 bg-muted/70 text-foreground shadow-sm'
              : 'border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          <BotIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
