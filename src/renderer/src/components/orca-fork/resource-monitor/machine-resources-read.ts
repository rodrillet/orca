// orca-fork: one machine's resources, from the fork RPC or, on a stock server, from its memory snapshot.
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import type { MemorySnapshot } from '../../../../../shared/diagnostics/process-stats-types'
import {
  MACHINE_RESOURCES_METHOD,
  MACHINE_RESOURCES_STOP_METHOD,
  type MachineResources,
  type MachineResourcesStopResult
} from '../../../../../shared/orca-fork/resource-monitor/machine-resources'

const TIMEOUT_MS = 8_000

export type MachineResourcesResult =
  | { status: 'ok'; data: MachineResources }
  /** A stock orca-server: totals and Orca only, no per-agent rows, no disk, no stop. */
  | { status: 'basic'; data: MachineResources }
  | { status: 'unreachable' }

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}

function fromMemorySnapshot(snapshot: MemorySnapshot): MachineResources {
  return {
    hostname: '',
    platform: 'linux',
    collectedAt: snapshot.collectedAt,
    memory: {
      total: snapshot.host.totalMemory,
      used: snapshot.host.usedMemory,
      available: snapshot.host.availableMemory
    },
    cpu: {
      cores: snapshot.host.cpuCoreCount,
      usagePercent: null,
      loadAverage1m: snapshot.host.loadAverage1m
    },
    disk: null,
    orca: { cpu: snapshot.app.cpu, memory: snapshot.app.memory },
    agents: [],
    others: []
  }
}

export async function readMachineResources(
  target: RuntimeClientTarget
): Promise<MachineResourcesResult> {
  const options = { timeoutMs: TIMEOUT_MS, reuseRecentCompatibilityFailure: true }
  try {
    const data = await callRuntimeRpc<MachineResources>(
      target,
      MACHINE_RESOURCES_METHOD,
      {},
      options
    )
    return { status: 'ok', data }
  } catch (error) {
    if (errorCode(error) !== 'method_not_found') {
      return { status: 'unreachable' }
    }
  }
  try {
    const snapshot = await callRuntimeRpc<MemorySnapshot>(
      target,
      'diagnostics.memory',
      undefined,
      options
    )
    return { status: 'basic', data: fromMemorySnapshot(snapshot) }
  } catch {
    return { status: 'unreachable' }
  }
}

export function stopMachineProcess(
  target: RuntimeClientTarget,
  pid: number
): Promise<MachineResourcesStopResult> {
  return callRuntimeRpc<MachineResourcesStopResult>(target, MACHINE_RESOURCES_STOP_METHOD, {
    pid
  })
}
