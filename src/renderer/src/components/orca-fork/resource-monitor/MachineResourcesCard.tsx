// orca-fork: one machine in the resource monitor: memory, CPU, disk, then Orca and each agent process.
import React, { useEffect, useState } from 'react'
import { CircleStop } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type {
  MachineAgentProcess,
  MachineResources
} from '../../../../../shared/orca-fork/resource-monitor/machine-resources'
import { formatCpu, formatMemory } from '../../status-bar/resources/popover/resource-usage-metrics'
import { stopMachineProcess } from './machine-resources-read'
import type { MachineEntry } from './use-machine-resources'

const STOP_CONFIRM_MS = 4_000

function percent(part: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0
}

function toneClass(value: number): string {
  if (value >= 90) {
    return '[&_[data-slot=progress-indicator]]:bg-destructive'
  }
  if (value >= 75) {
    return '[&_[data-slot=progress-indicator]]:bg-yellow-500'
  }
  return ''
}

function Meter({
  label,
  value,
  detail
}: {
  label: string
  value: number
  detail: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{detail}</span>
      </div>
      <Progress value={value} className={cn('h-1.5', toneClass(value))} aria-label={label} />
    </div>
  )
}

function MachineMeters({ data }: { data: MachineResources }): React.JSX.Element {
  const t = useTranslate()
  const memoryPct = percent(data.memory.used, data.memory.total)
  const cpuPct =
    data.cpu.usagePercent ?? percent(data.cpu.loadAverage1m, Math.max(1, data.cpu.cores))
  return (
    <div className="flex flex-col gap-2.5">
      <Meter
        label={t('orcaFork.resourceMonitor.memory', 'Memory')}
        value={memoryPct}
        detail={t(
          'orcaFork.resourceMonitor.memoryDetail',
          '{{used}} of {{total}} · {{available}} available',
          {
            used: formatMemory(data.memory.used),
            total: formatMemory(data.memory.total),
            available: formatMemory(data.memory.available)
          }
        )}
      />
      <Meter
        label={t('orcaFork.resourceMonitor.cpu', 'CPU')}
        value={cpuPct}
        detail={t(
          'orcaFork.resourceMonitor.cpuDetail',
          '{{percent}} · load {{load}} · {{cores}} cores',
          {
            percent: `${Math.round(cpuPct)}%`,
            load: data.cpu.loadAverage1m.toFixed(2),
            cores: data.cpu.cores
          }
        )}
      />
      {data.disk ? (
        <Meter
          label={t('orcaFork.resourceMonitor.disk', 'Disk')}
          value={percent(data.disk.total - data.disk.free, data.disk.total)}
          detail={t('orcaFork.resourceMonitor.diskDetail', '{{free}} free of {{total}}', {
            free: formatMemory(data.disk.free),
            total: formatMemory(data.disk.total)
          })}
        />
      ) : null}
    </div>
  )
}

function UsageCells({ cpu, memory }: { cpu: number; memory: number }): React.JSX.Element {
  return (
    <span className="flex shrink-0 items-center tabular-nums text-xs text-muted-foreground">
      <span className="w-14 text-right">{formatCpu(cpu)}</span>
      <span className="w-20 text-right text-foreground">{formatMemory(memory)}</span>
    </span>
  )
}

function StopButton({
  machine,
  agent
}: {
  machine: MachineEntry
  agent: MachineAgentProcess
}): React.JSX.Element {
  const t = useTranslate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!confirming) {
      return
    }
    const timer = window.setTimeout(() => setConfirming(false), STOP_CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [confirming])
  const stop = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await stopMachineProcess(machine.target, agent.pid)
      if (result.stopped) {
        toast.success(
          t('orcaFork.resourceMonitor.stopped', 'Stopped {{name}}', { name: agent.label })
        )
      } else {
        toast.error(
          t('orcaFork.resourceMonitor.stopRefused', 'That process is no longer an agent.')
        )
      }
    } catch (error) {
      toast.error(
        t('orcaFork.resourceMonitor.stopFailed', 'Could not stop it: {{error}}', {
          error: error instanceof Error ? error.message : String(error)
        })
      )
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }
  const label = t('orcaFork.resourceMonitor.stopAgent', 'Stop {{name}} (pid {{pid}})', {
    name: agent.label,
    pid: agent.pid
  })
  return (
    <Button
      variant={confirming ? 'destructive' : 'ghost'}
      size="xs"
      disabled={busy}
      aria-label={label}
      title={label}
      onClick={() => (confirming ? void stop() : setConfirming(true))}
    >
      <CircleStop />
      {confirming ? t('orcaFork.resourceMonitor.confirmStop', 'Stop?') : null}
    </Button>
  )
}

function AgentRow({
  machine,
  agent,
  bot,
  canStop
}: {
  machine: MachineEntry
  agent: MachineAgentProcess
  bot: Bot | null
  canStop: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const owner = agent.botName ?? agent.workspaceName ?? agent.folder
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40">
      {bot ? (
        <BotAvatar bot={bot} className="size-6 shrink-0" />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <AgentIcon agent={agent.kind === 'agent' ? null : agent.kind} size={13} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs text-foreground">
          {agent.label}
          {owner ? <span className="text-muted-foreground"> · {owner}</span> : null}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {[
            agent.botName && agent.workspaceName ? agent.workspaceName : null,
            `pid ${agent.pid}`,
            agent.children > 0
              ? t('orcaFork.resourceMonitor.children', '+{{count}} child processes', {
                  count: agent.children,
                  defaultValue_one: '+{{count}} child process'
                })
              : null
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <UsageCells cpu={agent.cpu} memory={agent.memory} />
      <span className="flex w-14 shrink-0 justify-end">
        {canStop ? <StopButton machine={machine} agent={agent} /> : null}
      </span>
    </li>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-muted/30 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

export function MachineResourcesCard({
  machine,
  bots
}: {
  machine: MachineEntry
  bots: readonly Bot[]
}): React.JSX.Element {
  const t = useTranslate()
  const result = machine.result
  if (!result) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        {t('orcaFork.resourceMonitor.loading', 'Loading…')}
      </p>
    )
  }
  if (result.status === 'unreachable') {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        {t('orcaFork.resourceMonitor.unreachable', 'This machine is not answering right now.')}
      </p>
    )
  }
  const { data } = result
  const hostId =
    machine.target.kind === 'local' ? 'local' : `runtime:${machine.target.environmentId}`
  const botOf = (agent: MachineAgentProcess): Bot | null =>
    agent.botId ? (bots.find((b) => b.id === agent.botId && b.hostId === hostId) ?? null) : null
  const canStop = result.status === 'ok'
  return (
    <div className="flex flex-col">
      <div className="px-3 py-3">
        <MachineMeters data={data} />
      </div>
      {result.status === 'basic' ? (
        <p className="border-y border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
          {t(
            'orcaFork.resourceMonitor.basicServer',
            "This server runs the stock orca-server: per-agent rows, disk and Stop need the fork's server."
          )}
        </p>
      ) : null}
      <SectionTitle>{t('orcaFork.resourceMonitor.orcaSection', 'Orca')}</SectionTitle>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="flex-1 truncate text-xs text-foreground">
          {t('orcaFork.resourceMonitor.orcaItself', 'Orca (app and helpers)')}
        </span>
        <UsageCells cpu={data.orca.cpu} memory={data.orca.memory} />
        <span className="w-14 shrink-0" />
      </div>
      {canStop ? (
        <>
          <SectionTitle>
            {t('orcaFork.resourceMonitor.agentsSection', 'Agents ({{count}})', {
              count: data.agents.length
            })}
          </SectionTitle>
          {data.agents.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t('orcaFork.resourceMonitor.noAgents', 'No agent running on this machine.')}
            </p>
          ) : (
            <ul>
              {data.agents.map((agent) => (
                <AgentRow
                  key={agent.pid}
                  machine={machine}
                  agent={agent}
                  bot={botOf(agent)}
                  canStop={canStop}
                />
              ))}
            </ul>
          )}
          {data.others.length > 0 ? (
            <>
              <SectionTitle>
                {t('orcaFork.resourceMonitor.othersSection', 'Other heavy processes')}
              </SectionTitle>
              <ul>
                {data.others.map((other) => (
                  <li key={other.pid} className="flex items-center gap-2 px-3 py-1">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {other.name} <span className="text-[11px]">· pid {other.pid}</span>
                    </span>
                    <UsageCells cpu={other.cpu} memory={other.memory} />
                    <span className="w-14 shrink-0" />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
