// orca-fork: this host's resources for the resource monitor, the same on the desktop and on orca-server.
import { statfs } from 'node:fs/promises'
import os from 'node:os'
import type { MemorySnapshot } from '../../../shared/diagnostics/process-stats-types'
import {
  classifyAgentCommand,
  shortFolder,
  type MachineAgentProcess,
  type MachineOtherProcess,
  type MachineResources
} from '../../../shared/orca-fork/resource-monitor/machine-resources'
import { enumerateHostProcesses } from '../../memory/host-process-index'
import { getLocalDaemonPid } from '../../memory/local-daemon-pid'
import { collectSubtree, type ProcIndex } from '../../memory/process-index'
import { readProcessArgs, readProcessCwds } from './process-command-lines'

const OTHER_PROCESS_LIMIT = 6

export type MachineBotHome = { id: string; name: string; folder: string }

export type MachineResourcesSources = {
  memorySnapshot: () => Promise<MemorySnapshot>
  botHomes: () => MachineBotHome[]
}

type CpuTimes = { idle: number; total: number }
let previousCpuTimes: CpuTimes | null = null

function readCpuTimes(): CpuTimes {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.idle + t.irq
  }
  return { idle, total }
}

function cpuUsagePercent(): number | null {
  const now = readCpuTimes()
  const previous = previousCpuTimes
  previousCpuTimes = now
  if (!previous || now.total <= previous.total) {
    return null
  }
  const busy = 1 - (now.idle - previous.idle) / (now.total - previous.total)
  return Math.min(100, Math.max(0, busy * 100))
}

async function readDisk(): Promise<MachineResources['disk']> {
  const path = os.homedir()
  try {
    const fs = await statfs(path)
    return { path, total: fs.blocks * fs.bsize, free: fs.bavail * fs.bsize }
  } catch {
    return null
  }
}

function sumUsage(index: ProcIndex, pids: readonly number[]): { cpu: number; memory: number } {
  let cpu = 0
  let memory = 0
  for (const pid of pids) {
    const row = index.byPid.get(pid)
    cpu += row?.cpu ?? 0
    memory += row?.memory ?? 0
  }
  return { cpu, memory }
}

function isUnder(folder: string, home: string): boolean {
  const normalize = (p: string) => p.replace(/[\\/]+$/u, '')
  const f = normalize(folder)
  const h = normalize(home)
  return f === h || f.startsWith(`${h}/`) || f.startsWith(`${h}\\`)
}

function sessionWorkspaces(
  snapshot: MemorySnapshot
): Map<number, { worktreeId: string; name: string; repoId: string }> {
  const byPid = new Map<number, { worktreeId: string; name: string; repoId: string }>()
  for (const worktree of snapshot.worktrees) {
    for (const session of worktree.sessions) {
      if (session.pid > 0) {
        byPid.set(session.pid, {
          worktreeId: worktree.worktreeId,
          name: worktree.worktreeName,
          repoId: worktree.repoId
        })
      }
    }
  }
  return byPid
}

function ancestors(index: ProcIndex, pid: number): number[] {
  const chain: number[] = []
  const seen = new Set<number>([pid])
  let current = index.byPid.get(pid)?.ppid
  while (current !== undefined && current > 1 && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    current = index.byPid.get(current)?.ppid
  }
  return chain
}

type AgentRoot = { pid: number; kind: MachineAgentProcess['kind']; label: string }

/** Agent processes, an agent under another of the same program folded into the outer one. */
function findAgentRoots(index: ProcIndex, args: ReadonlyMap<number, string>): AgentRoot[] {
  const agents = new Map<number, AgentRoot>()
  for (const [pid, command] of args) {
    const program = classifyAgentCommand(command)
    if (program && index.byPid.has(pid)) {
      agents.set(pid, { pid, ...program })
    }
  }
  return [...agents.values()].filter(
    (agent) => !ancestors(index, agent.pid).some((pid) => agents.get(pid)?.kind === agent.kind)
  )
}

export async function collectMachineResources(
  sources: MachineResourcesSources
): Promise<MachineResources> {
  const [snapshot, index, disk] = await Promise.all([
    sources.memorySnapshot(),
    enumerateHostProcesses({ withNames: true }),
    readDisk()
  ])
  const args = await readProcessArgs(index)
  const roots = findAgentRoots(index, args)
  const cwds = await readProcessCwds(roots.map((root) => root.pid))
  const homes = sources.botHomes()
  const workspaces = sessionWorkspaces(snapshot)

  const claimed = new Set<number>()
  const agents: MachineAgentProcess[] = roots.map((root) => {
    const otherRoots = new Set(roots.filter((r) => r.pid !== root.pid).map((r) => r.pid))
    const tree = collectSubtree(index, root.pid, otherRoots)
    for (const pid of tree) {
      claimed.add(pid)
    }
    const cwd = cwds.get(root.pid) ?? null
    const bot = cwd ? (homes.find((home) => isUnder(cwd, home.folder)) ?? null) : null
    const workspace =
      ancestors(index, root.pid)
        .map((pid) => workspaces.get(pid))
        .find(Boolean) ?? null
    return {
      pid: root.pid,
      kind: root.kind,
      label: root.label,
      ...sumUsage(index, tree),
      children: tree.length - 1,
      botId: bot?.id ?? null,
      botName: bot?.name ?? null,
      worktreeId: workspace?.worktreeId ?? null,
      worktreeName: workspace?.name ?? null,
      repoId: workspace?.repoId || null,
      folder: cwd ? shortFolder(cwd) : null
    }
  })

  for (const root of [process.pid, getLocalDaemonPid()]) {
    if (root) {
      for (const pid of collectSubtree(index, root)) {
        claimed.add(pid)
      }
    }
  }
  const others: MachineOtherProcess[] = []
  for (const row of index.byPid.values()) {
    if (claimed.has(row.pid) || row.memory <= 0) {
      continue
    }
    others.push({
      pid: row.pid,
      name: row.name ?? programLabel(args.get(row.pid)) ?? `pid ${row.pid}`,
      cpu: row.cpu,
      memory: row.memory
    })
  }
  others.sort((a, b) => b.memory - a.memory)

  return {
    hostname: os.hostname(),
    platform: process.platform,
    collectedAt: Date.now(),
    memory: {
      total: snapshot.host.totalMemory,
      used: snapshot.host.usedMemory,
      available: snapshot.host.availableMemory
    },
    cpu: {
      cores: snapshot.host.cpuCoreCount,
      usagePercent: cpuUsagePercent(),
      loadAverage1m: snapshot.host.loadAverage1m
    },
    disk,
    orca: { cpu: snapshot.app.cpu, memory: snapshot.app.memory },
    agents: agents.sort((a, b) => b.memory - a.memory),
    others: others.slice(0, OTHER_PROCESS_LIMIT)
  }
}

function programLabel(command: string | undefined): string | null {
  const first = command?.trim().split(/\s+/u)[0]
  return first ? (first.split(/[\\/]/u).pop() ?? null) : null
}

/** True when `pid` is an agent process right now, so a stop never reaches anything else. */
export async function isAgentProcess(pid: number): Promise<boolean> {
  const index = await enumerateHostProcesses({ withNames: true })
  if (!index.byPid.has(pid)) {
    return false
  }
  const args = await readProcessArgs(index, [pid])
  return findAgentRoots(index, args).some((root) => root.pid === pid)
}
