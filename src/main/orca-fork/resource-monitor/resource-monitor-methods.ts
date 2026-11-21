// orca-fork: the resource monitor's RPCs; a paired desktop asks each server for its own machine.
import {
  MACHINE_RESOURCES_METHOD,
  MACHINE_RESOURCES_STOP_METHOD,
  MachineResourcesParams,
  MachineResourcesStopParams,
  type MachineResourcesStopResult
} from '../../../shared/orca-fork/resource-monitor/machine-resources'
import { botHomeFolder } from '../../bots/bot-home'
import { assertBotGroupOwner } from '../../runtime/rpc/methods/bot-groups'
import { defineMethod } from '../../runtime/rpc/core'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import {
  collectMachineResources,
  isAgentProcess,
  type MachineBotHome
} from './machine-resources-collector'

const STOP_GRACE_MS = 5_000

function botHomes(runtime: OrcaRuntimeService): MachineBotHome[] {
  try {
    if (!runtime.bots.enabled()) {
      return []
    }
    return runtime.bots
      .list()
      .map((bot) => ({ id: bot.id, name: bot.name, folder: botHomeFolder(bot) }))
  } catch {
    return []
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export const RESOURCE_MONITOR_METHODS = [
  defineMethod({
    name: MACHINE_RESOURCES_METHOD,
    permission: 'workspace',
    params: MachineResourcesParams,
    handler: async (_params, { runtime }) =>
      collectMachineResources({
        memorySnapshot: () => runtime.getMemorySnapshot(),
        botHomes: () => botHomes(runtime)
      })
  }),
  defineMethod({
    name: MACHINE_RESOURCES_STOP_METHOD,
    permission: 'workspace',
    params: MachineResourcesStopParams,
    handler: async ({ pid }, context): Promise<MachineResourcesStopResult> => {
      // Only the owner's desktop or phone stops agents; an agent can't stop another from the CLI.
      assertBotGroupOwner(context)
      if (!(await isAgentProcess(pid))) {
        return { stopped: false, reason: alive(pid) ? 'not_agent' : 'gone' }
      }
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        return { stopped: false, reason: 'gone' }
      }
      const timer = setTimeout(() => {
        if (alive(pid)) {
          try {
            process.kill(pid, 'SIGKILL')
          } catch {
            // exited in between
          }
        }
      }, STOP_GRACE_MS)
      timer.unref?.()
      return { stopped: true }
    }
  })
]
