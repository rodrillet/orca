// orca-fork: workspace settings › Machine: the computer the workspace runs on, live (system, address,
// memory, CPU, disk, uptime) from `orcaFork.resources.machine`, and the agents running there with their RAM.
import React, { useEffect, useState } from 'react'
import { Laptop, Server } from 'lucide-react'
import { useAppStore } from '@/store'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { botHostTarget } from '@/lib/bot-hosts'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { BotAvatar } from '@/components/bots/BotAvatar'
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import type { ForkWorkspace } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { forkWorkspaceOfItem } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { formatCpu, formatMemory } from '../../status-bar/resources/popover/resource-usage-metrics'
import { MachineMeters } from '../resource-monitor/MachineResourcesCard'
import {
  readMachineResources,
  type MachineResourcesResult
} from '../resource-monitor/machine-resources-read'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { useForkWorkspaceMachines } from '../workspaces/use-fork-workspace-machines'
import { useWorkspaceBots } from './use-workspace-bots'
import { SettingsEmpty, SettingsRow, SettingsSectionTitle } from './workspace-settings-rows'

const POLL_MS = 3_000

function useMachineSample(workspace: ForkWorkspace): MachineResourcesResult | null {
  const [result, setResult] = useState<MachineResourcesResult | null>(null)
  useEffect(() => {
    let cancelled = false
    let inFlight = false
    const target = botHostTarget(workspace.hostId)
    const poll = (): void => {
      if (inFlight) {
        return
      }
      inFlight = true
      void readMachineResources(target).then((next) => {
        inFlight = false
        if (!cancelled) {
          setResult(next)
        }
      })
    }
    poll()
    const stop = installWindowVisibilityInterval({ run: poll, intervalMs: POLL_MS })
    return () => {
      cancelled = true
      stop()
    }
  }, [workspace.hostId])
  return result
}

/** The paired server's address as Orca reaches it (its preferred endpoint's host). */
function usePairedAddress(workspace: ForkWorkspace): string | null {
  const parsed = parseExecutionHostId(workspace.hostId)
  const environmentId = parsed?.kind === 'runtime' ? parsed.environmentId : null
  const environment = useAppStore((s) =>
    environmentId ? s.runtimeEnvironments.find((env) => env.id === environmentId) : undefined
  )
  const endpoint =
    environment?.endpoints.find((e) => e.id === environment.preferredEndpointId) ??
    environment?.endpoints[0]
  if (!endpoint) {
    return null
  }
  try {
    return new URL(endpoint.endpoint).host || null
  } catch {
    return null
  }
}

function formatUptime(seconds: number, t: Translate): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) {
    return t('orcaFork.workspaceSettings.machine.uptimeDays', '{{days}}d {{hours}}h', {
      days,
      hours
    })
  }
  return t('orcaFork.workspaceSettings.machine.uptimeHours', '{{hours}}h {{minutes}}min', {
    hours,
    minutes
  })
}

function Fact({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm text-foreground tabular-nums">{value}</span>
    </div>
  )
}

export function WorkspaceMachineTab({
  workspace
}: {
  workspace: ForkWorkspace
}): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const machines = useForkWorkspaceMachines()
  const { bots } = useWorkspaceBots()
  const sample = useMachineSample(workspace)
  const pairedAddress = usePairedAddress(workspace)
  const label =
    machines.find((m) => m.hostId === workspace.hostId)?.label ??
    t('orcaFork.workspaces.machineOffline', 'Machine not paired')
  const MachineIcon = workspace.hostId === LOCAL_EXECUTION_HOST_ID ? Laptop : Server
  const data = sample && sample.status !== 'unreachable' ? sample.data : null
  const system = data?.system
  const botById = new Map(bots.map((bot) => [bot.id, bot]))
  // Agents of every workspace on this machine run here; this tab lists this workspace's.
  const agents = (data?.agents ?? []).filter((agent) => {
    const botKey = agent.botId ? `${workspace.hostId}/${agent.botId}` : null
    const owner = botKey
      ? forkWorkspaceOfItem(doc, workspace.hostId, { botKey })
      : agent.repoId
        ? forkWorkspaceOfItem(doc, workspace.hostId, { repoId: agent.repoId })
        : null
    return owner?.id === workspace.id
  })
  const agentMemory = agents.reduce((sum, agent) => sum + agent.memory, 0)
  const addresses = [pairedAddress, ...(system?.addresses ?? [])].filter(
    (value, index, all): value is string => !!value && all.indexOf(value) === index
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <MachineIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{label}</span>
          <span className="truncate text-xs text-muted-foreground">
            {data?.hostname ||
              (sample?.status === 'unreachable'
                ? t('orcaFork.workspaceSettings.machine.unreachable', 'Not reachable right now')
                : t('orcaFork.workspaceSettings.machine.loading', 'Reading the machine…'))}
          </span>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Fact
              label={t('orcaFork.workspaceSettings.machine.address', 'IP / host')}
              value={addresses.length > 0 ? addresses.slice(0, 3).join(' · ') : '—'}
            />
            <Fact
              label={t('orcaFork.workspaceSettings.machine.os', 'System')}
              value={system ? `${system.os} · ${system.arch}` : data.platform}
            />
            <Fact
              label={t('orcaFork.workspaceSettings.machine.cpu', 'CPU')}
              value={
                system?.cpuModel
                  ? t(
                      'orcaFork.workspaceSettings.machine.cpuValue',
                      '{{model}} · {{cores}} cores',
                      {
                        model: system.cpuModel,
                        cores: data.cpu.cores
                      }
                    )
                  : t('orcaFork.workspaceSettings.machine.cores', '{{cores}} cores', {
                      cores: data.cpu.cores
                    })
              }
            />
            <Fact
              label={t('orcaFork.workspaceSettings.machine.uptime', 'Uptime')}
              value={system ? formatUptime(system.uptimeSeconds, t) : '—'}
            />
            <Fact
              label={t('orcaFork.workspaceSettings.machine.memory', 'RAM total · used · free')}
              value={`${formatMemory(data.memory.total)} · ${formatMemory(data.memory.used)} · ${formatMemory(data.memory.available)}`}
            />
            <Fact
              label={t('orcaFork.workspaceSettings.machine.disk', 'Disk total · free')}
              value={
                data.disk
                  ? `${formatMemory(data.disk.total)} · ${formatMemory(data.disk.free)}`
                  : '—'
              }
            />
          </div>
          <MachineMeters data={data} />
          {sample?.status === 'basic' || !system ? (
            <p className="text-xs text-muted-foreground">
              {t(
                'orcaFork.workspaceSettings.machine.stockServer',
                "This machine's orca-server doesn't report everything yet: install the fork's orca-server there for system details and agents."
              )}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <SettingsSectionTitle>
            {t('orcaFork.workspaceSettings.machine.agents', 'Agents running here')}
          </SettingsSectionTitle>
          {agents.length > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('orcaFork.workspaceSettings.machine.agentsMemory', '{{memory}} RAM in all', {
                memory: formatMemory(agentMemory)
              })}
            </span>
          ) : null}
        </div>
        {agents.length === 0 ? (
          <SettingsEmpty>
            {t(
              'orcaFork.workspaceSettings.machine.noAgents',
              'No agent of this workspace is running on the machine now.'
            )}
          </SettingsEmpty>
        ) : (
          agents.map((agent) => {
            const bot = agent.botId ? botById.get(agent.botId) : undefined
            return (
              <SettingsRow
                key={agent.pid}
                leading={
                  bot ? (
                    <BotAvatar bot={bot} className="size-8" />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <AgentIcon agent={agent.kind === 'agent' ? null : agent.kind} size={16} />
                    </span>
                  )
                }
                title={bot?.name ?? agent.botName ?? agent.worktreeName ?? agent.label}
                detail={
                  <span className="truncate">
                    {[agent.label, agent.folder].filter(Boolean).join(' · ')}
                  </span>
                }
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMemory(agent.memory)} · {formatCpu(agent.cpu)}
                </span>
              </SettingsRow>
            )
          })
        )}
      </div>
    </div>
  )
}
