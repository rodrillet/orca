// orca-fork: a bot's memory and CPU, from its agent processes on its machine: a compact line (row
// hover, cards) and a settings row listing each process.
import React from 'react'
import { Cpu, MemoryStick } from 'lucide-react'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { Bot } from '../../../../../shared/bot-types'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { formatCpu, formatMemory } from '../../status-bar/resources/popover/resource-usage-metrics'
import { useBotResources, type BotResources } from './use-bot-resources'

function useResourceWords(resources: BotResources): string | null {
  const t = useTranslate()
  switch (resources.state) {
    case 'loading':
      return t('orcaFork.botResources.loading', 'Reading memory…')
    case 'unreachable':
      return null
    case 'basic':
      return t(
        'orcaFork.botResources.basic',
        "Per-bot memory needs the fork's orca-server on this machine."
      )
    case 'ok':
      return resources.processes.length === 0
        ? t('orcaFork.botResources.none', 'No agent running · 0 MB')
        : null
  }
}

function Usage({
  resources,
  className
}: {
  resources: Extract<BotResources, { state: 'ok' }>
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <span className={cn('inline-flex items-center gap-2 tabular-nums', className)}>
      <span
        className="inline-flex items-center gap-0.5"
        title={t('orcaFork.botResources.memory', 'Memory')}
      >
        <MemoryStick className="size-3" />
        {formatMemory(resources.memory)}
      </span>
      <span
        className="inline-flex items-center gap-0.5"
        title={t('orcaFork.botResources.cpu', 'CPU')}
      >
        <Cpu className="size-3" />
        {formatCpu(resources.cpu)}
      </span>
      <span>
        {t('orcaFork.botResources.processes', '{{count}} agents', {
          count: resources.processes.length
        })}
      </span>
    </span>
  )
}

/** "1.2 GB · 12% · 3 agents", for the row's hover card and bot cards. */
export function ForkBotResourcesLine({
  bot,
  className
}: {
  bot: Bot
  className?: string
}): React.JSX.Element | null {
  const resources = useBotResources(bot)
  const words = useResourceWords(resources)
  if (!FORK_FEATURES.resourceMonitor) {
    return null
  }
  if (resources.state === 'ok' && resources.processes.length > 0) {
    return (
      <Usage resources={resources} className={cn('text-xs text-muted-foreground', className)} />
    )
  }
  return words ? (
    <span className={cn('text-xs text-muted-foreground', className)}>{words}</span>
  ) : null
}

/** The bot row's hover card: its latest line, then the bot's memory and CPU. */
export function withForkBotResources(bot: Bot, latest: React.ReactNode): React.ReactNode {
  return (
    <>
      {latest}
      <ForkBotResourcesLine bot={bot} />
    </>
  )
}

/** The settings row: totals, then each agent process with its own memory and CPU. */
export function ForkBotResourcesSettings({ bot }: { bot: Bot }): React.JSX.Element | null {
  const t = useTranslate()
  const resources = useBotResources(bot)
  const words = useResourceWords(resources)
  if (!FORK_FEATURES.resourceMonitor) {
    return null
  }
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">{t('orcaFork.botResources.title', 'Memory and CPU')}</span>
        {resources.state === 'ok' && resources.processes.length > 0 ? (
          <Usage resources={resources} className="ml-auto text-xs text-muted-foreground" />
        ) : null}
      </div>
      {words ? <span className="text-xs text-muted-foreground">{words}</span> : null}
      {resources.state === 'unreachable' ? (
        <span className="text-xs text-muted-foreground">
          {t('orcaFork.botResources.unreachable', "Can't reach this bot's machine.")}
        </span>
      ) : null}
      {resources.state === 'ok' && resources.processes.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {resources.processes.map((process) => (
            <li
              key={process.pid}
              className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
            >
              <AgentIcon agent={process.kind === 'agent' ? null : process.kind} size={12} />
              <span className="min-w-0 flex-1 truncate text-foreground/90">
                {process.label}
                {process.worktreeName ? ` · ${process.worktreeName}` : ''}
              </span>
              <span className="w-12 shrink-0 text-right tabular-nums">
                {formatCpu(process.cpu)}
              </span>
              <span className="w-16 shrink-0 text-right tabular-nums text-foreground">
                {formatMemory(process.memory)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
